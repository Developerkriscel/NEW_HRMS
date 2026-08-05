import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlatformRolePermissionSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformRole', required: true },
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformPermission', required: true },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformRolePermissionSchema.index({ role: 1, permission: 1 }, { unique: true })

export default model('PlatformRolePermission', PlatformRolePermissionSchema)
