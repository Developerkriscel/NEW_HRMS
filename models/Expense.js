import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const ExpenseSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    category: {
      type: String,
      enum: ['TRAVEL', 'FOOD', 'ACCOMMODATION', 'OFFICE_SUPPLIES', 'OTHER'],
      default: 'OTHER',
    },
    amount: { type: Number, required: true },
    description: { type: String },
    expenseDate: { type: Date, required: true },
    receiptNote: { type: String }, // free-text receipt reference; no file upload in scope
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'SENT_BACK'], default: 'PENDING' },
    managerRemarks: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

ExpenseSchema.index({ tenantId: 1, employee: 1 })
ExpenseSchema.index({ tenantId: 1, status: 1 })

export default model('Expense', ExpenseSchema)
