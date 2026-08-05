import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    description: { type: String },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    active: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('Department', DepartmentSchema)
