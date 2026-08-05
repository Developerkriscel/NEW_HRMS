import mongoose from 'mongoose'
import { model } from './_base'

// Point-in-time usage snapshots. Employee count and storage are computed
// from real data at snapshot time; api/integration counters are honestly 0
// until real instrumentation exists (no request-metering middleware or
// integration system has been built yet) — never a fabricated number.
const TenantUsageSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    employeeCount: { type: Number, default: 0 },
    employeeLimit: { type: Number, default: 0 },
    storageUsedMb: { type: Number, default: 0 },
    storageLimitMb: { type: Number, default: 0 },
    apiCallsThisMonth: { type: Number, default: 0 },
    apiQuota: { type: Number, default: 0 },
    integrationCount: { type: Number, default: 0 },
    integrationLimit: { type: Number, default: 0 },
    snapshotAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

TenantUsageSchema.index({ tenant: 1, snapshotAt: -1 })

export default model('TenantUsage', TenantUsageSchema)
