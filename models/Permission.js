import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Global (not tenant-scoped) — seeded once, assignable to any employee.
const PermissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "employee:create"
    description: { type: String },
    module: { type: String }, // HR, Payroll, Attendance, Leave, Reports
    ...baseFields,
  },
  { timestamps: true }
)

export default model('Permission', PermissionSchema)
