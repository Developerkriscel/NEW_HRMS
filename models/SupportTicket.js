import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', default: null },
    
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['Attendance & Time', 'Leave Management', 'Payroll & Compensation', 'Recruitment', 'Performance', 'Employee Data', 'Billing & Subscription', 'Account & Access', 'Integration', 'Feature Request', 'Technical Issue', 'Other'],
      required: true 
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], required: true },
    relatedModule: { type: String, default: null },
    
    status: { 
      type: String, 
      enum: ['OPEN', 'IN PROGRESS', 'WAITING FOR CUSTOMER', 'RESOLVED', 'CLOSED', 'REOPENED'], 
      default: 'OPEN',
      index: true
    },
    
    attachments: [{ type: String }],
    
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    ...baseFields,
  },
  { timestamps: true }
)

SupportTicketSchema.index({ createdAt: -1 })
SupportTicketSchema.index({ tenant: 1, status: 1 })

export default model('SupportTicket', SupportTicketSchema)
