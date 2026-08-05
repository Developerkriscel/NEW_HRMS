import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const RosterSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    weekStartDate: { type: Date, required: true }, // Monday of the roster week
    entries: [
      {
        date: { type: Date, required: true },
        shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
        isWeeklyOff: { type: Boolean, default: false },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    ...tenantFields,
  },
  { timestamps: true }
)

RosterSchema.index({ tenantId: 1, employee: 1, weekStartDate: 1 }, { unique: true })

export default model('Roster', RosterSchema)
