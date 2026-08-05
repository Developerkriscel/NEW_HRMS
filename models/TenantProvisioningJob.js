import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Platform-level record — deliberately uses `tenant`, not `tenantId`, so it
// is never redirected into a per-tenant database by models/_base.js's
// tenant-scoping heuristic (a schema path literally named `tenantId` is
// what triggers that). This must stay centrally queryable across all
// tenants for the provisioning history/retry UI to work at all.
const TenantProvisioningJobSchema = new mongoose.Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['PENDING', 'VALIDATING', 'PROVISIONING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'ROLLED_BACK'],
      default: 'PENDING',
    },
    // The validated wizard submission — steps read from this, never from
    // request bodies again, so a retry replays exactly what was approved.
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
    adminTempPassword: { type: String, default: null, select: false },
    error: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    ...baseFields,
  },
  { timestamps: true }
)

TenantProvisioningJobSchema.index({ status: 1, createdAt: -1 })

export default model('TenantProvisioningJob', TenantProvisioningJobSchema)
