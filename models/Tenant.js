import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const TenantSchema = new mongoose.Schema(
  {
    tenantCode: { type: String, required: true, unique: true }, // e.g. ACME
    companyName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    subdomain: { type: String, unique: true, sparse: true },
    customDomain: { type: String },
    logoUrl: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    gstNumber: { type: String },
    panNumber: { type: String },
    industryType: { type: String },
    status: {
      type: String,
      enum: ['TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED'],
      default: 'TRIAL',
    },
    graceEndsAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    purgeScheduledFor: { type: Date, default: null },
    // These four are the tenant's *effective* limits — set from the assigned
    // Plan at provisioning time, then independently editable per-tenant.
    // That in-place editability is the "limit override" mechanism itself;
    // there is no separate override/base-value pair to reconcile.
    employeeLimit: { type: Number, default: 50 },
    storageLimitMb: { type: Number, default: 5120 },
    storageUsedMb: { type: Number, default: 0 },
    apiQuota: { type: Number, default: 10000 },
    integrationLimit: { type: Number, default: 3 },
    databaseName: { type: String, unique: true, sparse: true },
    databaseStatus: { type: String, enum: ['PENDING', 'PROVISIONING', 'READY', 'ERROR'], default: 'PENDING' },
    databaseProvisionedAt: { type: Date, default: null },
    databaseLastCheckedAt: { type: Date, default: null },
    databaseError: { type: String, default: null },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    sendLoginInvitation: { type: Boolean, default: false },
    hrSettings: {
      employeeIdPrefix: { type: String, default: 'EMP' },
      workingDays: [{ type: String }],
      weeklyOff: [{ type: String }],
      officeStartTime: { type: String, default: '09:00' },
      officeEndTime: { type: String, default: '18:00' },
    },
    // Captured during onboarding for a future payroll/security module to
    // enforce — not yet read by any payroll or auth-gating logic in this
    // phase, so treat these as configuration-at-rest, not live behavior.
    payrollDefaults: {
      payFrequency: { type: String, enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY'], default: 'MONTHLY' },
      payrollCutoffDay: { type: Number, default: 25, min: 1, max: 28 },
    },
    securityDefaults: {
      allowedEmailDomains: [{ type: String }],
      sessionTimeoutMinutes: { type: Number, default: 60, min: 5 },
    },
    suspensionReason: { type: String }, // holds the reason for the most recent lifecycle change, not suspend-only — full history lives in TenantLifecycleEvent
    features: { type: Map, of: Boolean, default: {} },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },

    // Denormalized snapshot of the tenant's most recent provisioning job, so
    // the company list can show provisioning status without a join. The
    // TenantProvisioningJob/Step records remain the source of truth.
    provisioningStatus: {
      type: String,
      enum: ['PENDING', 'VALIDATING', 'PROVISIONING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'ROLLED_BACK'],
      default: 'PENDING',
    },
    provisioningJob: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantProvisioningJob', default: null },

    adminEmail: { type: String }, // primary administrator's email, for display/search without a tenant-DB lookup
    lastActivityAt: { type: Date, default: null },

    ...baseFields,
  },
  { timestamps: true }
)

TenantSchema.index({ status: 1 })
TenantSchema.index({ deleted: 1, status: 1 })
TenantSchema.index({ deleted: 1, createdAt: -1 })
TenantSchema.index({ adminEmail: 1, deleted: 1 })
TenantSchema.index({ provisioningStatus: 1 })

export default model('Tenant', TenantSchema)
