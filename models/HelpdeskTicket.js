import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const SLA_HOURS = { LOW: 96, MEDIUM: 48, HIGH: 24, URGENT: 8 }

const HelpdeskTicketSchema = new mongoose.Schema(
  {
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    category: { type: String },
    subject: { type: String, required: true },
    description: { type: String },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
    // Private grievances stay hidden from the manager unless the employee opts in.
    visibleToManager: { type: Boolean, default: true },
    slaDueAt: { type: Date },
    comments: [
      {
        text: { type: String, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        at: { type: Date, default: Date.now },
      },
    ],
    ...tenantFields,
  },
  { timestamps: true }
)

HelpdeskTicketSchema.pre('validate', function (next) {
  if (!this.slaDueAt) {
    const hours = SLA_HOURS[this.priority] || SLA_HOURS.MEDIUM
    this.slaDueAt = new Date(Date.now() + hours * 60 * 60 * 1000)
  }
  next()
})

HelpdeskTicketSchema.index({ tenantId: 1, raisedBy: 1 })
HelpdeskTicketSchema.index({ tenantId: 1, status: 1 })

export default model('HelpdeskTicket', HelpdeskTicketSchema)
