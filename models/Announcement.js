import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const AnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    scope: { type: String, enum: ['COMPANY', 'TEAM'], default: 'TEAM' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    // Set to the manager's employee id when scope === 'TEAM'.
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    ...tenantFields,
  },
  { timestamps: true }
)

AnnouncementSchema.index({ tenantId: 1, scope: 1, team: 1 })

export default model('Announcement', AnnouncementSchema)
