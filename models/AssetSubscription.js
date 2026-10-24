import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const AssetSubscriptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    category: { type: String, default: 'Software' },
    billingCycle: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'], default: 'MONTHLY' },
    cost: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR', trim: true, uppercase: true },
    seats: { type: Number, min: 1, default: 1 },
    usedSeats: { type: Number, min: 0, default: 0 },
    startDate: { type: Date, required: true },
    renewalDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: true },
    status: { type: String, enum: ['ACTIVE', 'TRIAL', 'PAUSED', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
    ownerEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    url: { type: String, default: '' },
    notes: { type: String, default: '' },
    ...tenantFields,
  },
  { timestamps: true }
)

AssetSubscriptionSchema.index({ tenantId: 1, status: 1, renewalDate: 1 })
AssetSubscriptionSchema.index({ tenantId: 1, provider: 1, name: 1 })

export default model('AssetSubscription', AssetSubscriptionSchema)
