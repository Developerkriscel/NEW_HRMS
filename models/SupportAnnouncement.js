import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SupportAnnouncementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: { type: String, enum: ['NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },

    ...baseFields,
  },
  { timestamps: true }
)

SupportAnnouncementSchema.index({ status: 1, publishedAt: -1 })

export default model('SupportAnnouncement', SupportAnnouncementSchema)
