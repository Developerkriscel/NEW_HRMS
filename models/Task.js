import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    startDate: { type: Date },
    dueDate: { type: Date },
    checklist: [
      {
        text: { type: String, required: true },
        done: { type: Boolean, default: false },
      },
    ],
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'APPROVED', 'REJECTED'],
      default: 'NOT_STARTED',
    },
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

TaskSchema.index({ tenantId: 1, assignedTo: 1 })
TaskSchema.index({ tenantId: 1, assignedBy: 1, status: 1 })

export default model('Task', TaskSchema)
