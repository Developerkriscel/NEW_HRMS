import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const LeaveTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    description: { type: String },
    defaultDays: { type: Number, default: 0 },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0 },
    encashable: { type: Boolean, default: false },
    paidLeave: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    requiresApproval: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('LeaveType', LeaveTypeSchema)
