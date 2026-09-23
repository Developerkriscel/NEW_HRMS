import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const MailSettingsSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['SMTP'], default: 'SMTP' },
    enabled: { type: Boolean, default: false },

    fromName: { type: String, default: 'NexaHR' },
    fromEmail: { type: String, default: '' },
    replyTo: { type: String, default: '' },

    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPasswordEncrypted: { type: String, default: '' },
    smtpPasswordIv: { type: String, default: '' },
    smtpPasswordTag: { type: String, default: '' },

    testRecipient: { type: String, default: '' },
    lastTestedAt: { type: Date, default: null },
    lastTestStatus: { type: String, enum: ['SUCCESS', 'FAILED', null], default: null },
    lastTestError: { type: String, default: '' },

    ...tenantFields,
  },
  { timestamps: true, collection: 'mail_settings' }
)

export default model('MailSettings', MailSettingsSchema)
