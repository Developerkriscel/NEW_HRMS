import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// System-wide and tenant-aware Notification model
// Uses `tenant` rather than `tenantId` so it can be stored both centrally or queried uniformly.
const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null, index: true }, // User / Employee ID or email
    targetRole: {
      type: String,
      enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE', 'FINANCE', 'IT_ADMIN', 'ALL'],
      default: 'ALL',
      index: true,
    },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    category: {
      type: String,
      enum: ['leave', 'payroll', 'attendance', 'document', 'asset', 'helpdesk', 'system', 'security', 'announcement', 'general'],
      default: 'general',
      index: true,
    },
    link: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    readBy: [{ type: String }], // Array of userIds who marked read if role broadcast
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ...baseFields,
  },
  { timestamps: true }
)

NotificationSchema.index({ tenant: 1, userId: 1, read: 1, createdAt: -1 })
NotificationSchema.index({ targetRole: 1, createdAt: -1 })

export default model('Notification', NotificationSchema)
