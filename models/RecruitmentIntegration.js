import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { INTEGRATION_PROVIDER_LIST } from '@/lib/publishingConstants'

// Per-tenant connection status to an external job board. Deliberately holds
// no credential/secret fields — Step 4 ships mock connectors only (no real
// LinkedIn/Naukri/Indeed/Foundit API access), so there is nothing to
// encrypt yet. If/when a real OAuth or API-key flow lands, store the secret
// the way models/ProviderCredential.js already does for platform
// integrations (secretCiphertext/secretIv/secretTag via
// lib/platformSecurity.js#encryptSecret) — never as a plain field here.
const RecruitmentIntegrationSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: INTEGRATION_PROVIDER_LIST, required: true },
    status: { type: String, enum: ['NOT_CONNECTED', 'CONNECTED', 'ERROR'], default: 'NOT_CONNECTED' },
    // Non-secret settings only (e.g. a mock company/page id, sync
    // preferences) — see the note above for why secrets don't belong here.
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    connectedAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    ...tenantFields,
  },
  { timestamps: true, collection: 'recruitment_integrations' }
)

RecruitmentIntegrationSchema.index({ tenantId: 1, provider: 1 }, { unique: true })

export default model('RecruitmentIntegration', RecruitmentIntegrationSchema)
