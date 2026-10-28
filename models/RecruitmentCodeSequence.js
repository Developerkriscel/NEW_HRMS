import mongoose from 'mongoose'
import { model } from './_base'

const RecruitmentCodeSequenceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    namespace: { type: String, required: true },
    year: { type: Number, required: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'recruitment_code_sequences' }
)

RecruitmentCodeSequenceSchema.index({ tenantId: 1, namespace: 1, year: 1 }, { unique: true })

export default model('RecruitmentCodeSequence', RecruitmentCodeSequenceSchema)
