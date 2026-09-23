import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SupportChatMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportConversation', required: true, index: true },
    
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderRole: { type: String, enum: ['COMPANY_ADMIN', 'PLATFORM_ADMIN'], required: true },
    
    message: { type: String, required: true },
    attachments: [{ type: String }],
    
    readBy: [{ type: mongoose.Schema.Types.ObjectId }],

    ...baseFields,
  },
  { timestamps: true }
)

SupportChatMessageSchema.index({ conversation: 1, createdAt: 1 })

export default model('SupportChatMessage', SupportChatMessageSchema)
