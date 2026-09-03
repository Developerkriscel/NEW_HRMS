import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // Free/Starter/Professional/Enterprise
    description: { type: String },
    price: { type: Number, required: true },
    billingCycle: { type: String, enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' },
    employeeLimit: { type: Number, default: -1 }, // -1 = unlimited
    storageLimitMb: { type: Number, default: 5120 },
    apiQuota: { type: Number, default: 10000 }, // calls/month, -1 = unlimited
    integrationLimit: { type: Number, default: 3 }, // -1 = unlimited
    retentionTier: { type: String, enum: ['STANDARD', 'EXTENDED', 'COMPLIANCE'], default: 'STANDARD' },
    gracePeriodDays: { type: Number, default: 7 },
    features: [{ type: String }],
    active: { type: Boolean, default: true },
    trialDays: { type: Number, default: 14 },
    sortOrder: { type: Number, default: 0 },
    ...baseFields,
  },
  { timestamps: true }
)

PlanSchema.index({ deleted: 1, active: 1, sortOrder: 1 })

export default model('Plan', PlanSchema)
