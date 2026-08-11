import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'

// application_stage_history — Step 8. Append-only. Every stage/status
// transition an application ever goes through lands here, in addition to
// updating Application.currentStage — "never just overwrite currentStage
// without keeping history."
const ApplicationStageHistorySchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },

    fromStageId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPipelineStage', default: null },
    toStageId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPipelineStage', default: null },
    // Denormalized labels — read back correctly even if the stage itself is
    // later renamed, or (for REJECTED/WITHDRAWN/TALENT_POOL) there's no
    // real stage document to reference at all.
    fromStageName: { type: String, default: null },
    toStageName: { type: String, default: null },

    action: { type: String, enum: Object.values(STAGE_HISTORY_ACTION), required: true },
    comment: { type: String, default: null },

    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    movedByName: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'application_stage_history' }
)

ApplicationStageHistorySchema.index({ tenantId: 1, applicationId: 1, createdAt: 1 })

export default model('ApplicationStageHistory', ApplicationStageHistorySchema)
