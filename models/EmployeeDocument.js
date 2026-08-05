import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const EmployeeDocumentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    category: { type: String, default: 'GENERAL' },
    fileUrl: { type: String },
    status: { type: String, enum: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'], default: 'SUBMITTED' },
    expiresAt: { type: Date, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    notes: { type: String },
    ...tenantFields,
  },
  { timestamps: true }
)

EmployeeDocumentSchema.index({ tenantId: 1, employee: 1 })
EmployeeDocumentSchema.index({ tenantId: 1, status: 1 })

export default model('EmployeeDocument', EmployeeDocumentSchema)
