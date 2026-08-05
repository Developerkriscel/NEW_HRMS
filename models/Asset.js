import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const AssetSchema = new mongoose.Schema(
  {
    assetTag: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    assignedDate: { type: Date, default: null },
    status: { type: String, enum: ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'LOST', 'RETIRED'], default: 'AVAILABLE' },
    condition: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

AssetSchema.index({ tenantId: 1, assignedTo: 1 })
AssetSchema.index({ tenantId: 1, assetTag: 1 })

export default model('Asset', AssetSchema)
