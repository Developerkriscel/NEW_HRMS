import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const DesignationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    grade: { type: String },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    active: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('Designation', DesignationSchema)
