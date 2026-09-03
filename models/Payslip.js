import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const PayslipSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    basicSalary: { type: Number, default: 0 },
    hraAllowance: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 0 },
    pfEmployerContribution: { type: Number, default: null },
    esiDeduction: { type: Number, default: 0 },
    esiEmployerContribution: { type: Number, default: null },
    tdsDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PROCESSING', 'REVIEW', 'APPROVED', 'FINALIZED', 'PAID', 'CANCELLED'], default: 'DRAFT' },
    payslipPdfUrl: { type: String },
    paymentDate: { type: Date },
    bankTransactionRef: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

PayslipSchema.index({ tenantId: 1, employee: 1, month: 1, year: 1 }, { unique: true })
PayslipSchema.index({ tenantId: 1, month: 1, year: 1 })

export default model('Payslip', PayslipSchema)
