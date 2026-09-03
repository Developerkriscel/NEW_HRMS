import Attendance from '@/models/Attendance'
import SalaryStructure from '@/models/SalaryStructure'
import Employee from '@/models/Employee'

const PF_RATE = 0.12
const ESI_RATE = 0.0075
const PF_WAGE_CEILING = 15000
const ESI_WAGE_CEILING = 21000

function round2(n) {
  return Math.round(n * 100) / 100
}
function round4(n) {
  return Math.round(n * 10000) / 10000
}

function getWorkingDaysInMonth(month, year) {
  const days = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= days; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
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
  const [structure, emp] = await Promise.all([
    SalaryStructure.findOne({ employee: employeeId, tenantId, isActive: true }),
    Employee.findOne({ _id: employeeId, tenantId, deleted: false })
  ])
  if (!emp) {
    throw new Error('Employee not found for payroll calculation')
  }

  const ctc = Number(structure?.ctc || emp?.ctc || 0)
  if (!ctc || ctc <= 0) {
    throw new Error('Salary/CTC is missing. Add salary structure or employee CTC before running payroll.')
  }

  const monthlyCtc = round2(ctc / 12)

  // Reverse-calculate Gross Salary from CTC by removing Employer PF & ESI
  const estimatedBasic = monthlyCtc * 0.4;
  const pfEmployerContributionFixed = round2(Math.min(estimatedBasic, PF_WAGE_CEILING) * PF_RATE);
  
  let esiEmployerContributionFixed = 0;
  if ((monthlyCtc - pfEmployerContributionFixed) <= ESI_WAGE_CEILING) {
    const estimatedGross = (monthlyCtc - pfEmployerContributionFixed) / 1.0325;
    esiEmployerContributionFixed = round2(estimatedGross * 0.0325);
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

  const workingDays = getWorkingDaysInMonth(month, year)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  const totalDaysInMonth = monthEnd.getDate()

  const records = await Attendance.find({
    employee: employeeId,
    tenantId,
    date: { $gte: monthStart, $lte: monthEnd },
  })
  
  const presentDays = records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length
  const effectiveWorkingDays = presentDays + halfDays * 0.5
  
  // Only penalize for unworked required working days
  const absentDays = Math.max(0, workingDays - effectiveWorkingDays)
  const paidDays = totalDaysInMonth - absentDays

  const perDaySalary = round4(grossSalary / totalDaysInMonth)
  const absentDeduction = round2(perDaySalary * absentDays)
  const earnedGross = round2(grossSalary - absentDeduction)
  
  // ESI Eligibility is based on fixed Gross Salary.
  const isEsiEligible = grossSalary <= ESI_WAGE_CEILING;
  const esiDeduction = isEsiEligible ? round2(earnedGross * ESI_RATE) : 0;

  // PF is calculated on the Earned Basic, prorated by paid calendar days
  const prorationFactor = totalDaysInMonth > 0 ? (paidDays / totalDaysInMonth) : 0;
  const earnedBasic = round2(basic * prorationFactor);
  const pfWage = Math.min(earnedBasic, PF_WAGE_CEILING);
  const pfDeduction = round2(pfWage * PF_RATE);
  
  const professionalTaxAmount = professionalTax(earnedGross)
  const tdsDeduction = 0 // TDS intentionally not implemented — needs an annualised calculation

  const esiEmployerContribution = isEsiEligible ? round2(earnedGross * 0.0325) : 0;
  const pfEmployerContribution = round2(pfWage * PF_RATE);

  // Reconcile Gross - Deductions = Net exactly.
  // Add LOP (absentDeduction) to deductions so fixed gross remains stable.
  const leaveDeduction = absentDeduction;
  const totalDeductions = pfDeduction + esiDeduction + professionalTaxAmount + tdsDeduction + leaveDeduction
  
  const netSalary = round2(grossSalary - totalDeductions)

  return {
    workingDays: totalDaysInMonth,
    presentDays,
    absentDays,
    leaveDays: 0,
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
