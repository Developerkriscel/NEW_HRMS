import mongoose from 'mongoose'
import { baseFields, model } from './_base'

// Records that a payment was received against an invoice — manually entered
// by an operator (bank transfer confirmation, cheque, etc). This is NOT a
// payment gateway integration: nothing here charges a card, calls a
// provider API, or moves money. `method`/`reference` are free-form so this
// stays provider-neutral until a real billing provider is chosen.
const PaymentMetadataSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'InvoiceMetadata', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    method: { type: String, default: 'OTHER' }, // e.g. BANK_TRANSFER, CHEQUE, OTHER — free text, no gateway
    reference: { type: String },
    paidAt: { type: Date, required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PlatformOperator', required: true },
    ...baseFields,
  },
  { timestamps: true }
)

export default model('PaymentMetadata', PaymentMetadataSchema)
