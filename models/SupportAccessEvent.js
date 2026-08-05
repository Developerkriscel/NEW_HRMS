import mongoose from 'mongoose'
import { model } from './_base'

// Append-only log of everything that happened *inside* a support session —
// separate from the general AuditLog because this is specifically what
// "log sensitive reads, writes and exports" during a support session means.
const SupportAccessEventSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportAccessSession', required: true, index: true },
    eventType: { type: String, enum: ['PAGE_ACCESS', 'SENSITIVE_READ', 'WRITE', 'EXPORT'], required: true },
    description: { type: String, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

SupportAccessEventSchema.index({ session: 1, createdAt: -1 })

export default model('SupportAccessEvent', SupportAccessEventSchema)
