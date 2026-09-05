import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const SalaryStructureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    ctc: { type: Number, default: 0 }, // annual CTC
    basicPercent: { type: Number, default: 40 },
    hraPercent: { type: Number, default: 20 },
    conveyanceAllowance: { type: Number, default: 1600 },
    medicalAllowance: { type: Number, default: 1250 },
    pfPercent: { type: Number, default: 12 },
    esiPercent: { type: Number, default: 0.75 },
    pfEligible: { type: Boolean, default: true },
    esiEligible: { type: Boolean, default: true },
    ptEligible: { type: Boolean, default: true },
    insuranceGroup: { type: String, default: null },
    approvalStatus: { type: String, enum: ['APPROVED', 'PENDING_APPROVAL', 'REJECTED'], default: 'APPROVED' },
    revisionNote: { type: String, default: null },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('SalaryStructure', SalaryStructureSchema)
