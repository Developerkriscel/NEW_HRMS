import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SupportTicketMessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
    
    // Who sent it? Can be an Employee (Company Admin) or PlatformOperator
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['COMPANY_ADMIN', 'PLATFORM_ADMIN'], required: true },
    
    message: { type: String, required: true },
    attachments: [{ type: String }],
    
    // Hidden from Company Admin
    isInternal: { type: Boolean, default: false },
    
    readBy: [{ type: mongoose.Schema.Types.ObjectId }],

    ...baseFields,
  },
  { timestamps: true }
)

SupportTicketMessageSchema.index({ ticket: 1, createdAt: 1 })

export default model('SupportTicketMessage', SupportTicketMessageSchema)
