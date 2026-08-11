export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_VERSION_STATUS } from '@/lib/offerConstants'
import { buildOfferVariables, renderOfferTemplate } from '@/lib/offerHelpers'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferTemplate from '@/models/OfferTemplate'
import Application from '@/models/Application'
import Tenant from '@/models/Tenant'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Employee from '@/models/Employee'
import Branch from '@/models/Branch'
import Preboarding from '@/models/Preboarding'

const EDITABLE_FIELDS = [
  'designationId', 'departmentId', 'managerId', 'joiningDate', 'locationId', 'employmentType',
  'workMode', 'ctc', 'salaryStructureId', 'probationPeriod', 'noticePeriod', 'offerValidUntil', 'templateId',
]

// GET — full detail: offer, its current version, and version history.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
    .populate('candidateId').populate({ path: 'jobId', select: 'jobCode jobTitle publicTitle hiringManager', populate: { path: 'hiringManager', select: 'firstName lastName' } })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')

  const [currentVersion, history] = await Promise.all([
    offer.currentVersionId
      ? OfferVersion.findOne({ tenantId, _id: offer.currentVersionId })
        .populate('designationId', 'name').populate('departmentId', 'name')
        .populate('managerId', 'firstName lastName').populate('locationId', 'name')
      : null,
    OfferVersion.find({ tenantId, offerId: offer._id, deleted: false }).sort({ version: -1 }).lean(),
  ])

  // Item — once accepted, the offer detail page links straight through to
  // the preboarding profile Step 15 created automatically.
  const preboarding = offer.status === 'ACCEPTED' ? await Preboarding.findOne({ tenantId, offerId: offer._id }).select('_id').lean() : null

  return ok({ ...offer.toObject(), currentVersion, history, preboardingId: preboarding?._id || null })
})

// PATCH — edits the current version *in place*, only while it's a DRAFT
// (matches CompensationProposal's PATCH semantics: once submitted, editing
// means generating a new version via POST .../offers instead — item 10's
// "never overwrite" applies from PENDING_APPROVAL onward).
export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to edit this offer', 403, 'FORBIDDEN')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version || version.status !== OFFER_VERSION_STATUS.DRAFT) {
    return fail('Only a draft offer can be edited directly — generate a new version instead', 400, 'INVALID_STATE')
  }

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) version[field] = field === 'ctc' ? Number(body[field]) : body[field]
  }

  const application = await Application.findOne({ _id: version.applicationId, tenantId }).populate('candidateId').populate('jobId')
  const template = version.templateId ? await OfferTemplate.findOne({ _id: version.templateId, tenantId }) : null
  if (template) {
    const [designation, department, manager, branch, tenant] = await Promise.all([
      version.designationId ? Designation.findById(version.designationId).select('name').lean() : null,
      version.departmentId ? Department.findById(version.departmentId).select('name').lean() : null,
      version.managerId ? Employee.findById(version.managerId).select('firstName lastName').lean() : null,
      version.locationId ? Branch.findById(version.locationId).select('name').lean() : null,
      Tenant.findById(tenantId).select('companyName').lean(),
    ])
    const variables = buildOfferVariables({ candidate: application?.candidateId, job: application?.jobId, designation, department, manager, branch, fields: version, tenant })
    version.renderedContent = renderOfferTemplate(template.content, variables)
  }

  await version.save()

  await logAction(session, { action: 'OFFER_UPDATED', entityType: 'Offer', entityId: offer._id, description: `Offer V${version.version} updated`, req })

  return ok({ offer, version }, 'Offer updated')
})
