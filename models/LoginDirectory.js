import mongoose from 'mongoose'
import { model } from './_base'

const LoginDirectorySchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    databaseName: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    role: { type: String, default: null },
    status: { type: String, default: null },
    deleted: { type: Boolean, default: false, index: true },
    lastSeenAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
)

LoginDirectorySchema.index({ email: 1, tenantId: 1 }, { unique: true })
LoginDirectorySchema.index({ email: 1, deleted: 1, lastSeenAt: -1 })

export default model('LoginDirectory', LoginDirectorySchema)
