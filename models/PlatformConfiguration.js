import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlatformConfigurationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['FEATURE_FLAG', 'GLOBAL_MODULE', 'MODULE_VERSION', 'REGISTRY', 'MIGRATION_STATUS', 'COMPATIBILITY_RULE', 'COUNTRY_PACK', 'GLOBAL_TEMPLATE', 'NOTIFICATION_TEMPLATE', 'EMAIL_CONFIG', 'STORAGE_CONFIG'],
      required: true,
      index: true,
    },
    key: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'INACTIVE', 'DEPRECATED', 'FAILED'], default: 'ACTIVE', index: true },
    version: { type: Number, default: 1 },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    country: { type: String, default: null, index: true },
    dataRegion: { type: String, default: null, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
    targets: {
      allTenants: { type: Boolean, default: false },
      plans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
      tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
      countries: [{ type: String }],
      dataRegions: [{ type: String }],
      percentage: { type: Number, min: 0, max: 100, default: 0 },
      internalDemoTenants: { type: Boolean, default: false },
    },
    moduleKey: { type: String, default: null, index: true },
    moduleVersion: { type: String, default: null },
    dependencies: [{ type: String }],
    compatibility: { type: mongoose.Schema.Types.Mixed, default: {} },
    migrationState: { type: String, enum: ['NOT_STARTED', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK'], default: 'NOT_STARTED', index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformConfiguration', default: null },
    effectiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null, index: true },
    reminderAt: { type: Date, default: null, index: true },
    ...baseFields,
  },
  { timestamps: true }
)

PlatformConfigurationSchema.index({ type: 1, key: 1, version: -1 }, { unique: true })
PlatformConfigurationSchema.index({ type: 1, status: 1, updatedAt: -1 })

export default model('PlatformConfiguration', PlatformConfigurationSchema)
