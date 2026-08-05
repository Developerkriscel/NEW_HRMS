import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlatformRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "PLATFORM_OWNER"
    description: { type: String },
    isSystem: { type: Boolean, default: false }, // seeded roles — protected from delete/rename
    mfaRequired: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('PlatformRole', PlatformRoleSchema)
