import mongoose from 'mongoose'
import { model } from './_base'

const EmployeeCodeSequenceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    companyCode: { type: String, required: true },
    year: { type: Number, required: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'employee_code_sequences' }
)

EmployeeCodeSequenceSchema.index({ tenantId: 1, companyCode: 1, year: 1 }, { unique: true })

export default model('EmployeeCodeSequence', EmployeeCodeSequenceSchema)
