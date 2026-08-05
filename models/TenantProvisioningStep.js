import mongoose from 'mongoose'
import { model } from './_base'

export const PROVISIONING_STEP_KEYS = [
  'VALIDATE',
  'CREATE_TENANT',
  'PROVISION_DATABASE',
  'SEED_TENANT_DATA',
  'CREATE_PRIMARY_ADMIN',
  'CREATE_SUBSCRIPTION',
  'SEND_INVITATION',
  'FINALIZE',
]

// One row per (job, step) — the unique index is what makes retries
// idempotent: re-running a job re-uses the existing COMPLETED step record
// instead of repeating the side effect (e.g. creating a second Tenant).
const TenantProvisioningStepSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantProvisioningJob', required: true },
    stepKey: { type: String, enum: PROVISIONING_STEP_KEYS, required: true },
    order: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED'], default: 'PENDING' },
    output: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

TenantProvisioningStepSchema.index({ job: 1, stepKey: 1 }, { unique: true })

export default model('TenantProvisioningStep', TenantProvisioningStepSchema)
