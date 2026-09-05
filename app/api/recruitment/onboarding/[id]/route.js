export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canViewSensitivePreboardingData } from '@/lib/preboardingConstants'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'
import PreboardingEmploymentHistory from '@/models/PreboardingEmploymentHistory'
import PreboardingEducation from '@/models/PreboardingEducation'
import PreboardingBankDetails from '@/models/PreboardingBankDetails'
import PreboardingStatutoryDetails from '@/models/PreboardingStatutoryDetails'
import CandidateDocument from '@/models/CandidateDocument'
import PreboardingTask from '@/models/PreboardingTask'
import OfferVersion from '@/models/OfferVersion'
import Designation from '@/models/Designation'
import Department from '@/models/Department'
import Branch from '@/models/Branch'
import Employee from '@/models/Employee'
import Shift from '@/models/Shift'
import { ensureDefaultPreboardingTasks } from '@/lib/preboardingTaskHelpers'

// GET — everything the Candidate Preboarding Profile's 6 tabs need in one
// call. Bank/statutory details are only included when the requesting
// session actually has sensitive-data access (item 13/14) — a manager
// hitting this route gets every other tab, just not those two.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
    .populate('candidateId').populate('jobId', 'jobCode jobTitle publicTitle')
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  await ensureDefaultPreboardingTasks(tenantId, preboarding)

  const [personal, emergencyContact, employmentHistory, education, documents, tasks, version] = await Promise.all([
    PreboardingPersonalDetails.findOne({ tenantId, preboardingId: preboarding._id }),
    PreboardingEmergencyContact.findOne({ tenantId, preboardingId: preboarding._id }),
    PreboardingEmploymentHistory.find({ tenantId, preboardingId: preboarding._id, deleted: false }).sort({ order: 1 }),
    PreboardingEducation.find({ tenantId, preboardingId: preboarding._id, deleted: false }).sort({ order: 1 }),
    CandidateDocument.find({ tenantId, preboardingId: preboarding._id, deleted: false }).populate('currentVersionId'),
    PreboardingTask.find({ tenantId, preboardingId: preboarding._id, deleted: false }).sort({ dueDate: 1, createdAt: 1 }),
    OfferVersion.findOne({ tenantId, _id: preboarding.offerVersionId }),
  ])

  let bank = null, statutory = null
  const sensitive = canViewSensitivePreboardingData(session)
  if (sensitive) {
    [bank, statutory] = await Promise.all([
      PreboardingBankDetails.findOne({ tenantId, preboardingId: preboarding._id }),
      PreboardingStatutoryDetails.findOne({ tenantId, preboardingId: preboarding._id }),
    ])
  }

  const [designation, department, branch, manager, shift] = await Promise.all([
    version?.designationId ? Designation.findById(version.designationId).select('name').lean() : null,
    version?.departmentId ? Department.findById(version.departmentId).select('name').lean() : null,
    version?.locationId ? Branch.findById(version.locationId).select('name address city state country phone').lean() : null,
    version?.managerId ? Employee.findById(version.managerId).select('firstName lastName').lean() : null,
    version?.shiftId ? Shift.findById(version.shiftId).select('name startTime endTime gracePeriodMinutes workingDays weeklyOff active').lean() : null,
  ])

  return ok({
    ...preboarding.toObject(),
    personal, emergencyContact, employmentHistory, education, bank, statutory, documents, tasks,
    canViewSensitive: sensitive,
    candidateCode: preboarding.candidateId?.candidateCode,
    candidateName: preboarding.candidateId ? `${preboarding.candidateId.firstName} ${preboarding.candidateId.lastName}`.trim() : null,
    candidateEmail: preboarding.candidateId?.email,
    candidatePhone: preboarding.candidateId?.phone,
    jobTitle: preboarding.jobId?.publicTitle || preboarding.jobId?.jobTitle,
    designationId: version?.designationId || null,
    departmentId: version?.departmentId || null,
    locationId: version?.locationId || null,
    shiftId: version?.shiftId || null,
    branch,
    shift,
    offer: version ? {
      version: version.version, ctc: version.ctc, employmentType: version.employmentType, workMode: version.workMode,
      salaryStructure: version.salaryStructure,
      pfEligible: version.pfEligible,
      esiEligible: version.esiEligible,
      ptEligible: version.ptEligible,
      insuranceGroup: version.insuranceGroup,
      designationId: version.designationId,
      departmentId: version.departmentId,
      locationId: version.locationId,
      shiftId: version.shiftId,
      designation: designation?.name, department: department?.name, location: branch?.name,
      reportingManager: manager ? `${manager.firstName} ${manager.lastName}` : null,
      shift,
      branch,
    } : null,
  })
})
