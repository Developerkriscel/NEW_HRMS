import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const PreboardingTaskSchema = new mongoose.Schema(
  {
    preboardingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Preboarding', required: true },
    name: { type: String, required: true },
    assignedTo: { type: String, default: 'HR Department' },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    required: { type: Boolean, default: true },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
    completedAt: { type: Date, default: null },
    completedByName: { type: String, default: null },
    deleted: { type: Boolean, default: false },
    ...tenantFields,
  },
  { timestamps: true, collection: 'preboarding_tasks' }
)

PreboardingTaskSchema.index({ tenantId: 1, preboardingId: 1, deleted: 1 })

export default model('PreboardingTask', PreboardingTaskSchema)
