import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Global catalogue of HR modules a plan/tenant can be granted (Payroll,
// Recruitment, etc). Distinct from models/Permission.js (employee-level
// action permissions) and from PlatformPermission (operator RBAC) — this is
// product-feature packaging, not access control.
const ModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "payroll"
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    dependencies: [{ type: String }], // other module keys this one requires
    status: { type: String, enum: ['ACTIVE', 'DEPRECATED'], default: 'ACTIVE' },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('Module', ModuleSchema)
