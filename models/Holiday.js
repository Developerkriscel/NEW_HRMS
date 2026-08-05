import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

const HolidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    date: { type: Date, required: true },
    recurringAnnually: { type: Boolean, default: false }, // e.g. national holidays that fall on the same date every year
    optional: { type: Boolean, default: false }, // optional/restricted holiday vs. a mandatory one
    ...tenantFields,
  },
  { timestamps: true }
)

HolidaySchema.index({ tenantId: 1, date: 1 })

export default model('Holiday', HolidaySchema)
