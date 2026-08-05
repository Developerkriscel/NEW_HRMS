import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const LeaveBalanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    year: { type: Number, required: true },
    totalDays: { type: Number, default: 0 },
    usedDays: { type: Number, default: 0 },
    carryForwardDays: { type: Number, default: 0 },
    pendingDays: { type: Number, default: 0 },
    ...tenantFields,
  },
  { timestamps: true }
)

LeaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true })

LeaveBalanceSchema.methods.getAvailableDays = function () {
  return this.totalDays + this.carryForwardDays - this.usedDays - this.pendingDays
}

export default model('LeaveBalance', LeaveBalanceSchema)
