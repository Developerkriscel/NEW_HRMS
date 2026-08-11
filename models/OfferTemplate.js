import mongoose from 'mongoose'
import { tenantFields, model } from './_base'

// offer_templates — reusable letter bodies HR maintains instead of any
// legal text living in application code (item 5: "avoid building legal
// text directly into code"). `content` is plain text/simple-HTML holding
// {{variable}} placeholders (see lib/offerConstants.js#OFFER_TEMPLATE_VARIABLES);
// lib/offerHelpers.js#renderOfferTemplate does the substitution at
// generation time and the *result* is frozen onto the OfferVersion
// (renderedContent) — editing a template later never rewrites an already-
// generated offer.
const OfferTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: null }, // e.g. "Full-Time Employee" — see OFFER_TEMPLATE_CATEGORIES, freeform not enum
    description: { type: String, default: null },
    content: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false }, // pre-selected in the offer form when nothing else is chosen

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdByName: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'offer_templates' }
)

OfferTemplateSchema.index({ tenantId: 1, isActive: 1 })

export default model('OfferTemplate', OfferTemplateSchema)
