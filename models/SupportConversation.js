import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SupportConversationSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    
    // participants can include employee ID or platform operator ID
    participants: [{ type: mongoose.Schema.Types.ObjectId }],
    
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },

    ...baseFields,
  },
  { timestamps: true }
)

export default model('SupportConversation', SupportConversationSchema)
