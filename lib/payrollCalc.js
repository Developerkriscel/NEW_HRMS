import Attendance from '@/models/Attendance'
import SalaryStructure from '@/models/SalaryStructure'
import Employee from '@/models/Employee'
import Holiday from '@/models/Holiday'

const PF_WAGE_CEILING = 15000
const ESI_WAGE_CEILING = 21000

function round2(n) {
  return Math.round(n * 100) / 100
}
function round4(n) {
  return Math.round(n * 10000) / 10000
}

function getLocalDayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function getWorkingDays(start, end, workingDayNames, holidayKeys) {
  let count = 0
  const workingDays = new Set(workingDayNames || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dayName = cursor.toLocaleDateString('en-US', { weekday: 'long' })
    if (workingDays.has(dayName) && !holidayKeys.has(getLocalDayKey(cursor))) count++
  }
  return count
}

function getPayrollPeriod(month, year, joiningDate) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const today = new Date()
  const periodEnd = today.getFullYear() === year && today.getMonth() === month - 1
    ? new Date(year, month - 1, today.getDate())
    : monthEnd
  const joiningDay = joiningDate ? new Date(joiningDate) : null
  const periodStart = joiningDay && joiningDay > monthStart && joiningDay <= periodEnd
    ? new Date(year, month - 1, joiningDay.getDate())
    : monthStart
  return { periodStart, periodEnd }
}

function professionalTax(earnedGross) {
  if (earnedGross > 20000) return 200
  if (earnedGross > 10000) return 175
  if (earnedGross > 7500) return 150
  return 0
}

// Simplified India-statutory payroll calc — intentionally preserves the
// original system's known simplifications (no real TDS, flat PT slab, flat
// conveyance/medical allowances) rather than "improving" them.
export async function calculatePayslip({ employeeId, tenantId, month, year }) {
  const emp = await Employee.findOne({ _id: employeeId, tenantId, deleted: false })
    .populate('shift', 'workingDays weeklyOff')
  if (!emp) {
    throw new Error('Employee not found for payroll calculation')
  }

  const { periodStart, periodEnd } = getPayrollPeriod(month, year, emp.joiningDate)
  if (emp.joiningDate && new Date(emp.joiningDate) > periodEnd) {
    throw new Error('Employee was not active during this payroll period.')
  }

  const structure = await SalaryStructure.findOne({
    employee: employeeId,
    tenantId,
    isActive: true,
    deleted: false,
    approvalStatus: 'APPROVED',
    $and: [
      { $or: [
        { effectiveFrom: { $lte: new Date(periodEnd).setHours(23, 59, 59, 999) } },
        { effectiveFrom: null },
        { effectiveFrom: { $exists: false } },
      ] },
      { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }, { effectiveTo: { $exists: false } }] },
    ],
  }).sort({ effectiveFrom: -1, createdAt: -1 })

  const ctc = Number(structure?.ctc || emp?.ctc || 0)
  if (!ctc || ctc <= 0) {
    throw new Error('Salary/CTC is missing. Add salary structure or employee CTC before running payroll.')
  }

  const monthlyCtc = round2(ctc / 12)
  const pfRate = structure?.pfEligible === false ? 0 : Number(structure?.pfPercent ?? 12) / 100
  const esiRate = structure?.esiEligible === false ? 0 : Number(structure?.esiPercent ?? 0.75) / 100
  const esiEmployerRate = structure?.esiEligible === false ? 0 : 0.0325

  // Reverse-calculate Gross Salary from CTC by removing Employer PF & ESI
  const estimatedBasic = monthlyCtc * 0.4;
  const pfEmployerContributionFixed = round2(Math.min(estimatedBasic, PF_WAGE_CEILING) * pfRate);
  
  let esiEmployerContributionFixed = 0;
  if (esiEmployerRate > 0 && (monthlyCtc - pfEmployerContributionFixed) <= ESI_WAGE_CEILING) {
    const estimatedGross = (monthlyCtc - pfEmployerContributionFixed) / (1 + esiEmployerRate);
    esiEmployerContributionFixed = round2(estimatedGross * esiEmployerRate);
  }

  const grossSalary = monthlyCtc - pfEmployerContributionFixed - esiEmployerContributionFixed;

  const basicPercent = Number(structure?.basicPercent ?? 40)
  const hraPercent = Number(structure?.hraPercent ?? 20)
  const configuredConveyance = Number(structure?.conveyanceAllowance ?? 0)
  const configuredMedical = Number(structure?.medicalAllowance ?? 0)

  const basic = round2(Math.min(grossSalary, grossSalary * (basicPercent / 100)))
  const hra = round2(Math.min(Math.max(0, grossSalary - basic), grossSalary * (hraPercent / 100)))
  const conveyanceBase = structure ? configuredConveyance : grossSalary * 0.15
  const conveyance = round2(Math.min(Math.max(0, grossSalary - basic - hra), conveyanceBase))
  const medicalBase = structure ? configuredMedical : grossSalary * 0.15
  const medical = round2(Math.min(Math.max(0, grossSalary - basic - hra - conveyance), medicalBase))
  // Ensure the total strictly matches grossSalary by dumping any rounding dust into special
  const special = round2(grossSalary - basic - hra - conveyance - medical)

  const monthStart = new Date(periodStart)
  const monthEnd = new Date(periodEnd)
  monthEnd.setHours(23, 59, 59, 999)
  const holidayRecords = await Holiday.find({
    tenantId,
    deleted: false,
    optional: false,
    date: { $gte: monthStart, $lte: monthEnd },
  }).select('date').lean()
  const holidayKeys = new Set(holidayRecords.map((holiday) => getLocalDayKey(new Date(holiday.date))))
  const workingDays = getWorkingDays(periodStart, periodEnd, emp.shift?.workingDays, holidayKeys)
  const totalDaysInPeriod = Math.max(1, Math.floor((new Date(periodEnd).setHours(23, 59, 59, 999) - new Date(periodStart).setHours(0, 0, 0, 0)) / 86400000) + 1)

  const records = await Attendance.find({
    employee: employeeId,
    tenantId,
    date: { $gte: monthStart, $lte: monthEnd },
  })
  
  const presentDays = records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length
  const leaveDays = records.filter((r) => r.status === 'ON_LEAVE').length
  const effectiveWorkingDays = presentDays + halfDays * 0.5 + leaveDays
  
  // Only penalize for unworked required working days
  const absentDays = Math.max(0, workingDays - effectiveWorkingDays)
  const paidDays = Math.max(0, totalDaysInPeriod - absentDays)

  const perDaySalary = round4(grossSalary / totalDaysInPeriod)
  const absentDeduction = round2(perDaySalary * absentDays)
  const earnedGross = round2(grossSalary - absentDeduction)
  
  // ESI Eligibility is based on fixed Gross Salary.
  const isEsiEligible = structure?.esiEligible !== false && grossSalary <= ESI_WAGE_CEILING;
  const esiDeduction = isEsiEligible ? round2(earnedGross * esiRate) : 0;

  // PF is calculated on the Earned Basic, prorated by paid calendar days
  const prorationFactor = totalDaysInPeriod > 0 ? (paidDays / totalDaysInPeriod) : 0;
  const earnedBasic = round2(basic * prorationFactor);
  const pfWage = Math.min(earnedBasic, PF_WAGE_CEILING);
  const pfDeduction = round2(pfWage * pfRate);
  
  const professionalTaxAmount = structure?.ptEligible === false ? 0 : professionalTax(earnedGross)
  const tdsDeduction = 0 // TDS intentionally not implemented — needs an annualised calculation

  const esiEmployerContribution = isEsiEligible ? round2(earnedGross * esiEmployerRate) : 0;
  const pfEmployerContribution = round2(pfWage * pfRate);

  // Reconcile Gross - Deductions = Net exactly.
  // Add LOP (absentDeduction) to deductions so fixed gross remains stable.
  const leaveDeduction = absentDeduction;
  const totalDeductions = pfDeduction + esiDeduction + professionalTaxAmount + tdsDeduction + leaveDeduction
  
  const netSalary = round2(grossSalary - totalDeductions)

  return {
    workingDays,
    paidDays: round2(paidDays),
    presentDays,
    absentDays,
    leaveDays,
    grossSalary: round2(grossSalary),
    basicSalary: round2(basic),
    hraAllowance: round2(hra),
    conveyanceAllowance: conveyance,
    medicalAllowance: medical,
    specialAllowance: round2(special),
    pfDeduction,
    pfEmployerContribution,
    esiDeduction,
    esiEmployerContribution,
    professionalTax: professionalTaxAmount,
    tdsDeduction,
    leaveDeduction,
    totalDeductions: round2(totalDeductions),
    netSalary,
  }
}
