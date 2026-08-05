import mongoose from 'mongoose'
import { model } from './_base'

// Structured, append-only status-transition history for a tenant — powers
// the lifecycle timeline on the company detail page. Uses `tenant`, not
// `tenantId`, for the same reason as TenantProvisioningJob: this must live
// in the master database, never inside a per-tenant one. Complements (does
// not replace) the generic AuditLog, which every lifecycle change also
// writes to for the cross-entity platform audit trail.
const TenantLifecycleEventSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    reason: { type: String, required: true },
    purgeScheduledFor: { type: Date, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    performedByEmail: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

TenantLifecycleEventSchema.index({ tenant: 1, createdAt: -1 })

export default model('TenantLifecycleEvent', TenantLifecycleEventSchema)
