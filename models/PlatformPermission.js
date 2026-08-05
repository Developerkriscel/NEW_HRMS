import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Global permission catalogue for the platform-operator RBAC system.
// Distinct from models/Permission.js, which is tenant-side (employee
// module permissions like "employee:create") and lives inside every
// tenant's own database — these two must never be merged.
const PlatformPermissionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "tenant.suspend"
    description: { type: String, required: true },
    category: { type: String, required: true }, // e.g. "tenant", "plan", "operator", "audit"
    ...baseFields,
  },
  { timestamps: true }
)

PlatformPermissionSchema.index({ category: 1 })

export default model('PlatformPermission', PlatformPermissionSchema)
