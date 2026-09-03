import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const ShiftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "General", "Morning", "Night"
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "18:00"
    gracePeriodMinutes: { type: Number, default: 0 },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    weeklyOff: {
      type: [String],
      default: ['Saturday', 'Sunday'],
    },
    active: { type: Boolean, default: true },
    ...tenantFields,
  },
  { timestamps: true }
)

export default model('Shift', ShiftSchema)
