import mongoose from 'mongoose'
import { tenantFields, model } from './_base'
import { OFFER_VERSION_STATUS, OFFER_VERSION_STATUS_LIST } from '@/lib/offerConstants'

// offer_versions — one row per version, never mutated once it leaves DRAFT
// ("Never overwrite an offer" — item 10). Candidate negotiation (Step 14's
// Request Discussion) and internal Reject/Request Revision both resolve to
// the same outcome here: HR prepares a new version, the old one stays
// exactly as it was decided.
const OfferVersionSchema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    // Denormalized so version-scoped queries/reports don't need a join back
    // through Offer — same convention as CompensationProposal.
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },

    version: { type: Number, required: true, default: 1 },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferVersion', default: null },

    designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

    joiningDate: { type: Date, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    employmentType: { type: String, default: null },
    workMode: { type: String, default: null },

    ctc: { type: Number, required: true },
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },

    probationPeriod: { type: String, default: null }, // free text, e.g. "6 months"
    noticePeriod: { type: String, default: null },

    offerValidUntil: { type: Date, required: true },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'OfferTemplate', default: null },
    // The fully variable-substituted letter body at generation time — frozen,
    // never re-rendered even if the template is edited afterward.
    renderedContent: { type: String, default: null },
    pdfUrl: { type: String, default: null },

    status: { type: String, enum: OFFER_VERSION_STATUS_LIST, default: OFFER_VERSION_STATUS.DRAFT },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdByName: { type: String, default: null },
    submittedAt: { type: Date, default: null },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    approvedByName: { type: String, default: null },
    approvedAt: { type: Date, default: null },

    rejectionReason: { type: String, default: null },
    revisionComment: { type: String, default: null },

    ...tenantFields,
  },
  { timestamps: true, collection: 'offer_versions' }
)

OfferVersionSchema.index({ tenantId: 1, offerId: 1, version: -1 })

export default model('OfferVersion', OfferVersionSchema)
