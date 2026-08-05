import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    phone: { type: String },
    headOffice: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    latitude: { type: Number },
    longitude: { type: Number },
    geoFenceRadius: { type: Number, default: 100 },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('Branch', BranchSchema)
