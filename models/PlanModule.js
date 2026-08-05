import mongoose from 'mongoose'
import { baseFields, model } from './_base'

const PlanModuleSchema = new mongoose.Schema(
  {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    availability: { type: String, enum: ['INCLUDED', 'ADD_ON', 'UNAVAILABLE'], default: 'UNAVAILABLE' },
    ...baseFields,
  },
  { timestamps: true }
)

PlanModuleSchema.index({ plan: 1, module: 1 }, { unique: true })

export default model('PlanModule', PlanModuleSchema)
