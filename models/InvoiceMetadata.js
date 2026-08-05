import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Provider-neutral record-keeping only — no billing provider is integrated
// in this codebase, so there is nothing to generate this from automatically.
// An operator records that an invoice was issued; nothing here calculates
// tax, totals across periods, or otherwise behaves like an accounting
// ledger.
const InvoiceMetadataSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['DRAFT', 'ISSUED', 'PAID', 'VOID'], default: 'DRAFT' },
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    notes: { type: String },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('InvoiceMetadata', InvoiceMetadataSchema)
