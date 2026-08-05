import Attendance from '@/models/Attendance'
import SalaryStructure from '@/models/SalaryStructure'

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
  const structure = await SalaryStructure.findOne({ employee: employeeId, tenantId, isActive: true })
  const ctc = structure ? structure.ctc : 30000

  const monthlyCtc = round2(ctc / 12)
  const basic = monthlyCtc * 0.4
  const hra = basic * 0.4
  const conveyance = 1600
  const medical = 1250
  const special = Math.max(0, monthlyCtc - basic - hra - conveyance - medical)
  const grossSalary = basic + hra + conveyance + medical + special

  const workingDays = getWorkingDaysInMonth(month, year)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const records = await Attendance.find({
    employee: employeeId,
    tenantId,
    date: { $gte: monthStart, $lte: monthEnd },
  })
  const presentDays = records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length
  const effectiveDays = presentDays + halfDays * 0.5

  const perDaySalary = round4(grossSalary / workingDays)
  const absentDeduction = effectiveDays < workingDays ? round2(perDaySalary * (workingDays - effectiveDays)) : 0
  const earnedGross = grossSalary - absentDeduction

  const pfWage = Math.min(basic, PF_WAGE_CEILING)
  const pfDeduction = round2(pfWage * PF_RATE)
  const esiDeduction = earnedGross <= ESI_WAGE_CEILING ? round2(earnedGross * ESI_RATE) : 0
  const professionalTaxAmount = professionalTax(earnedGross)
  const tdsDeduction = 0 // TDS intentionally not implemented — needs an annualised calculation

  const totalDeductions = pfDeduction + esiDeduction + professionalTaxAmount + tdsDeduction
  const netSalary = round2(earnedGross - totalDeductions)

  return {
    workingDays,
    presentDays,
    absentDays: Math.round(workingDays - effectiveDays),
    leaveDays: 0,
    grossSalary: round2(grossSalary),
    basicSalary: round2(basic),
    hraAllowance: round2(hra),
    conveyanceAllowance: conveyance,
    medicalAllowance: medical,
    specialAllowance: round2(special),
    pfDeduction,
    esiDeduction,
    professionalTax: professionalTaxAmount,
    tdsDeduction,
    totalDeductions: round2(totalDeductions),
    netSalary,
  }
}
