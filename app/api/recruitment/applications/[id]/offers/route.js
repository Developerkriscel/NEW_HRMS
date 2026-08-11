export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, isEligibleForOffer, OFFER_STATUS, OFFER_VERSION_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import {
  generateOfferCode, assembleOfferAutoFill, buildOfferVariables, renderOfferTemplate,
  getLatestOfferVersion, OFFER_VERSION_STATUSES_EDITABLE,
} from '@/lib/offerHelpers'
import Application from '@/models/Application'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferTemplate from '@/models/OfferTemplate'
import Tenant from '@/models/Tenant'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Employee from '@/models/Employee'
import Branch from '@/models/Branch'

// GET — the offer thread for this application (if one exists yet), with
// its current version and full version history. Used to auto-fill the
// "Generate Offer" screen and to redirect straight to an existing draft
// instead of silently starting a second one.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const offer = await Offer.findOne({ tenantId, applicationId: params.id, deleted: false })
  if (!offer) return ok(null)

  const [currentVersion, history] = await Promise.all([
    offer.currentVersionId ? OfferVersion.findOne({ tenantId, _id: offer.currentVersionId }) : null,
    OfferVersion.find({ tenantId, offerId: offer._id, deleted: false }).sort({ version: -1 }).lean(),
  ])

  return ok({ offer, currentVersion, history })
})

// POST { designationId?, departmentId?, managerId?, joiningDate?, locationId?,
//        employmentType?, workMode?, ctc?, salaryStructureId?, probationPeriod?,
//        noticePeriod?, offerValidUntil, templateId } — auto-fills anything
// not explicitly overridden from Job/Selection/Compensation (item 3). Only
// reachable once Selection AND Compensation are both approved (item 2).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to generate an offer', 403, 'FORBIDDEN')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if (!isEligibleForOffer(application)) {
    return fail('An offer can only be generated once Selection is approved and Compensation is approved', 400, 'INVALID_STATE')
  }

  if (!body.templateId) return fail('An offer template is required', 400, 'VALIDATION_ERROR')
  const template = await OfferTemplate.findOne({ _id: body.templateId, tenantId, deleted: false })
  if (!template) return fail('That offer template was not found', 404, 'NOT_FOUND')

  const auto = await assembleOfferAutoFill(tenantId, application)
  const fields = {
    designationId: body.designationId || auto.fields.designationId,
    departmentId: body.departmentId || auto.fields.departmentId,
    managerId: body.managerId || auto.fields.managerId,
    joiningDate: body.joiningDate || auto.fields.joiningDate,
    locationId: body.locationId || auto.fields.locationId,
    employmentType: body.employmentType || auto.fields.employmentType,
    workMode: body.workMode || auto.fields.workMode,
    ctc: body.ctc != null ? Number(body.ctc) : auto.fields.ctc,
    salaryStructureId: body.salaryStructureId || auto.fields.salaryStructureId,
    probationPeriod: body.probationPeriod || auto.fields.probationPeriod,
    noticePeriod: body.noticePeriod || auto.fields.noticePeriod,
    offerValidUntil: body.offerValidUntil || null,
  }
  if (!fields.joiningDate) return fail('A joining date is required', 400, 'VALIDATION_ERROR')
  if (!fields.ctc) return fail('An annual CTC is required', 400, 'VALIDATION_ERROR')
  if (!fields.offerValidUntil) return fail('An offer expiry (valid until) date is required', 400, 'VALIDATION_ERROR')

  // Re-resolve display names from the *final* field values rather than
  // trusting auto.designation/etc — those were fetched for the auto-fill
  // defaults and would be stale if the caller overrode any of these ids.
  const [designation, department, manager, branch, tenant] = await Promise.all([
    fields.designationId ? Designation.findById(fields.designationId).select('name').lean() : null,
    fields.departmentId ? Department.findById(fields.departmentId).select('name').lean() : null,
    fields.managerId ? Employee.findById(fields.managerId).select('firstName lastName').lean() : null,
    fields.locationId ? Branch.findById(fields.locationId).select('name').lean() : null,
    Tenant.findById(tenantId).select('companyName').lean(),
  ])
  const variables = buildOfferVariables({ candidate: application.candidateId, job: application.jobId, designation, department, manager, branch, fields, tenant })
  const renderedContent = renderOfferTemplate(template.content, variables)

  const actorName = await getActorName(session)
  let offer = await Offer.findOne({ tenantId, applicationId: application._id, deleted: false })
  if (!offer) {
    offer = await Offer.create({
      tenantId,
      offerCode: await generateOfferCode(tenantId),
      applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
      status: OFFER_STATUS.DRAFT,
      createdBy: session.userId, createdByName: actorName,
    })
  }

  const latest = await getLatestOfferVersion(tenantId, offer._id)
  let version
  if (latest && latest.status === OFFER_VERSION_STATUS.DRAFT) {
    Object.assign(latest, fields, { templateId: template._id, renderedContent })
    await latest.save()
    version = latest
  } else {
    version = await OfferVersion.create({
      tenantId,
      offerId: offer._id, applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
      version: (latest?.version || 0) + 1,
      supersedes: latest?._id || null,
      ...fields,
      templateId: template._id, renderedContent,
      status: OFFER_VERSION_STATUS.DRAFT,
      createdBy: session.userId, createdByName: actorName,
    })
    offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Offer V${version.version} generated by ${actorName}`, actorName })
  }
  offer.currentVersionId = version._id
  offer.status = OFFER_STATUS.DRAFT
  await offer.save()

  await logAction(session, { action: 'OFFER_GENERATED', entityType: 'Offer', entityId: offer._id, description: `Offer V${version.version} generated for ${application.applicationCode}`, req })

  return ok({ offer, version }, 'Offer generated', 201)
})
