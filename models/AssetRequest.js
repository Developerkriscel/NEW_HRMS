import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const AssetRequestSchema = new mongoose.Schema(
  {
    requestedFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assetName: { type: String, required: true },
    type: { type: String, enum: ['NEW', 'REPLACEMENT'], default: 'NEW' },
    relatedAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
    reason: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewerRemarks: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

AssetRequestSchema.index({ tenantId: 1, requestedFor: 1 })
AssetRequestSchema.index({ tenantId: 1, status: 1 })

export default model('AssetRequest', AssetRequestSchema)
