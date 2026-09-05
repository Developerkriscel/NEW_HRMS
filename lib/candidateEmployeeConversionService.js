import mongoose from 'mongoose'
import { hashPassword } from '@/lib/auth'
import { APPLICATION_STATUS, CANDIDATE_STATUS } from '@/lib/candidateConstants'
import { JOB_STATUS } from '@/lib/jobConstants'
import { OFFER_STATUS } from '@/lib/offerConstants'
import { FORM_STATUS, PREBOARDING_STATUS, VERIFICATION_STATUS } from '@/lib/preboardingConstants'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'
import Job from '@/models/Job'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import Preboarding from '@/models/Preboarding'
import PreboardingPersonalDetails from '@/models/PreboardingPersonalDetails'
import PreboardingEmergencyContact from '@/models/PreboardingEmergencyContact'
import PreboardingBankDetails from '@/models/PreboardingBankDetails'
import PreboardingStatutoryDetails from '@/models/PreboardingStatutoryDetails'
import CandidateDocument from '@/models/CandidateDocument'
import Employee from '@/models/Employee'
import EmployeeCodeSequence from '@/models/EmployeeCodeSequence'
import Tenant from '@/models/Tenant'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import Branch from '@/models/Branch'
import Shift from '@/models/Shift'
import SalaryStructure from '@/models/SalaryStructure'
import PreboardingTask from '@/models/PreboardingTask'

export const EMPLOYEE_READINESS_STATUS = {
  NOT_READY: 'NOT_READY',
  READY_TO_CREATE_EMPLOYEE: 'READY_TO_CREATE_EMPLOYEE',
}

export const EMPLOYEE_CONVERSION_STATUS = {
  NOT_READY: 'NOT_READY',
  READY: 'READY',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== ''
const fullName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim()
const splitName = (name, fallbackFirst, fallbackLast = '-') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { firstName: fallbackFirst || 'Employee', lastName: fallbackLast || '-' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || fallbackLast || '-' }
}
const custom = (statutory, keys) => {
  const bag = statutory?.customFields || {}
  for (const key of keys) {
    if (hasValue(bag[key])) return bag[key]
  }
  return null
}

async function loadConversionContext(tenantId, preboardingId) {
  const preboarding = await Preboarding.findOne({ _id: preboardingId, tenantId, deleted: false })
  if (!preboarding) return null

  const [tenant, candidate, application, job, offer, version, personal, emergencyContact, bank, statutory, documents, tasks] = await Promise.all([
    Tenant.findById(tenantId).lean(),
    Candidate.findOne({ _id: preboarding.candidateId, tenantId, deleted: false }),
    Application.findOne({ _id: preboarding.applicationId, tenantId, deleted: false }),
    Job.findOne({ _id: preboarding.jobId, tenantId, deleted: false }),
    Offer.findOne({ _id: preboarding.offerId, tenantId, deleted: false }),
    OfferVersion.findOne({ _id: preboarding.offerVersionId, tenantId, deleted: false }),
    PreboardingPersonalDetails.findOne({ tenantId, preboardingId }),
    PreboardingEmergencyContact.findOne({ tenantId, preboardingId }),
    PreboardingBankDetails.findOne({ tenantId, preboardingId }),
    PreboardingStatutoryDetails.findOne({ tenantId, preboardingId }),
    CandidateDocument.find({ tenantId, preboardingId, deleted: false }).populate('currentVersionId'),
    PreboardingTask.find({ tenantId, preboardingId, deleted: false }),
  ])

  const [department, designation, branch, manager, shift] = await Promise.all([
    version?.departmentId ? Department.findById(version.departmentId).select('name').lean() : null,
    version?.designationId ? Designation.findById(version.designationId).select('name').lean() : null,
    version?.locationId ? Branch.findById(version.locationId).select('name city state country').lean() : null,
    version?.managerId ? Employee.findById(version.managerId).select('firstName lastName employeeCode email').lean() : null,
    version?.shiftId ? Shift.findById(version.shiftId).select('name startTime endTime gracePeriodMinutes workingDays weeklyOff').lean() : null,
  ])

  return {
    tenant, preboarding, candidate, application, job, offer, version,
    personal, emergencyContact, bank, statutory, documents, tasks,
    department, designation, branch, manager, shift,
  }
}

function proposedEmployeeCode(ctx) {
  const prefix = ctx.tenant?.hrSettings?.employeeIdPrefix || ctx.tenant?.tenantCode || 'EMP'
  const year = new Date(ctx.preboarding.confirmedJoiningDate || ctx.preboarding.proposedJoiningDate || Date.now()).getFullYear()
  return `${prefix}-${year}-####`
}

function buildMasterRecord(ctx, employeeCode = proposedEmployeeCode(ctx)) {
  const name = ctx.personal?.fullLegalName || fullName(ctx.candidate)
  const nameParts = splitName(name, ctx.candidate?.firstName, ctx.candidate?.lastName)
  const aadhaarNumber = custom(ctx.statutory, ['aadhaarNumber', 'aadhaarNo', 'aadharNumber', 'aadharNo'])
  const esiNumber = custom(ctx.statutory, ['esiNumber', 'esiNo'])
  const pfNumber = custom(ctx.statutory, ['pfNumber', 'pfNo'])
  const salaryTakeHome = custom(ctx.statutory, ['salaryTakeHome'])
  const officialEmail = custom(ctx.statutory, ['officialEmail', 'officialMailId'])
  const officialPhone = custom(ctx.statutory, ['officialPhoneNumber'])

  return {
    employeeCode,
    companyName: ctx.tenant?.companyName || null,
    status: 'ACTIVE',
    companyCode: ctx.tenant?.tenantCode || null,
    name,
    colorCode: null,
    discTest: null,
    country: ctx.branch?.country || ctx.tenant?.country || null,
    workClassification: custom(ctx.statutory, ['workClassification']) || null,
    motherHead: null,
    departmentId: ctx.version?.departmentId || null,
    department: ctx.department?.name || null,
    designationId: ctx.version?.designationId || null,
    designation: ctx.designation?.name || null,
    joiningDate: ctx.preboarding.confirmedJoiningDate || ctx.preboarding.proposedJoiningDate || ctx.version?.joiningDate || null,
    shiftId: ctx.version?.shiftId || null,
    shift: ctx.shift?.name || null,
    workingHours: ctx.shift?.startTime && ctx.shift?.endTime
      ? `${ctx.shift.startTime}-${ctx.shift.endTime}`
      : ctx.tenant?.hrSettings?.officeStartTime && ctx.tenant?.hrSettings?.officeEndTime
        ? `${ctx.tenant.hrSettings.officeStartTime}-${ctx.tenant.hrSettings.officeEndTime}`
        : null,
    inTiming: ctx.shift?.startTime || ctx.tenant?.hrSettings?.officeStartTime || null,
    gracePeriodMinutes: ctx.shift?.gracePeriodMinutes ?? null,
    workingDays: Array.isArray(ctx.shift?.workingDays) ? ctx.shift.workingDays.join(', ') : null,
    weekOff: Array.isArray(ctx.shift?.weeklyOff)
      ? ctx.shift.weeklyOff.join(', ')
      : Array.isArray(ctx.tenant?.hrSettings?.weeklyOff)
        ? ctx.tenant.hrSettings.weeklyOff.join(', ')
        : null,
    areaZone: custom(ctx.statutory, ['areaZone']) || null,
    state: ctx.branch?.state || ctx.tenant?.state || null,
    locationId: ctx.version?.locationId || null,
    location: ctx.branch?.name || null,
    reportingManagerId: ctx.version?.managerId || null,
    reportingManager: fullName(ctx.manager) || null,
    hodId: null,
    hod: null,
    gender: custom(ctx.statutory, ['gender']) || null,
    maritalStatus: custom(ctx.statutory, ['maritalStatus']) || null,
    dateOfBirth: ctx.personal?.dateOfBirth || null,
    anniversaryDate: custom(ctx.statutory, ['anniversaryDate']) || null,
    bloodGroup: custom(ctx.statutory, ['bloodGroup']) || null,
    fatherName: custom(ctx.statutory, ['fatherName']) || null,
    motherName: custom(ctx.statutory, ['motherName']) || null,
    spouseName: custom(ctx.statutory, ['spouseName']) || null,
    currentAddress: ctx.personal?.currentAddress || null,
    permanentAddress: ctx.personal?.permanentAddress || null,
    phone: ctx.personal?.mobileNumber || ctx.candidate?.phone || null,
    emergencyContactNumber: ctx.emergencyContact?.phone || null,
    emergencyPersonName: ctx.emergencyContact?.contactName || null,
    officialPhoneNumber: officialPhone,
    personalEmail: ctx.personal?.personalEmail || ctx.candidate?.email || null,
    officialEmail,
    bankAccountNumber: ctx.bank?.bankAccountNumber || null,
    bankName: ctx.bank?.bankName || null,
    bankIfscCode: ctx.bank?.bankIfscCode || null,
    accountHolderName: ctx.bank?.accountHolderName || null,
    bankBranch: ctx.bank?.bankBranch || null,
    panNumber: ctx.statutory?.panNumber || null,
    aadhaarNumber,
    uanNumber: ctx.statutory?.uanNumber || null,
    pfNumber,
    esiNumber,
    ctc: ctx.version?.ctc ?? null,
    salaryTakeHome: salaryTakeHome ? Number(salaryTakeHome) : null,
    verifiedStatus: ctx.verificationStatus || 'VERIFIED',
    offerLetterLink: ctx.version?.pdfUrl || null,
    appointmentLetterLink: null,
    probationPeriod: ctx.version?.probationPeriod || null,
    dateOfExit: null,
    remark: null,
    rightHrApp: null,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: officialEmail || ctx.personal?.personalEmail || ctx.candidate?.email || null,
  }
}

function item(key, label, value, required = true) {
  const ready = hasValue(value)
  return { key, label, value: value ?? null, required, ready, status: ready ? 'AVAILABLE' : required ? 'PENDING' : 'PENDING' }
}

function checklistFor(ctx, master) {
  const bankReady = hasValue(master.bankAccountNumber) && hasValue(master.bankName) && hasValue(master.bankIfscCode)
  const personalReady = hasValue(master.name) && hasValue(master.dateOfBirth)
  const required = [
    item('companyName', 'Company', master.companyName),
    item('companyCode', 'Company Code', master.companyCode),
    item('name', 'Name', master.name),
    item('department', 'Department', master.department),
    item('designation', 'Designation', master.designation),
    item('joiningDate', 'Date of Joining', master.joiningDate),
    item('location', 'Location', master.location),
    item('shift', 'Shift', master.shift),
    item('reportingManager', 'Reporting Manager', master.reportingManager),
    item('personalInformation', 'Personal Information', personalReady ? 'Complete' : null),
    item('phone', 'Phone', master.phone),
    item('personalEmail', 'Personal Email', master.personalEmail),
    item('bankDetails', 'Bank Details', bankReady ? 'Complete' : null),
    item('panNumber', 'PAN', master.panNumber),
    item('aadhaarNumber', 'Aadhaar', master.aadhaarNumber),
    item('ctc', 'CTC', master.ctc),
    item('offerLetterLink', 'Offer Letter', master.offerLetterLink),
    item('probationPeriod', 'Probation Period', master.probationPeriod),
  ]
  const optional = [
    item('uanNumber', 'UAN', master.uanNumber, false),
    item('pfNumber', 'PF Number', master.pfNumber, false),
    item('esiNumber', 'ESI', master.esiNumber, false),
    item('officialEmail', 'Official Email', master.officialEmail, false),
    item('officialPhoneNumber', 'Official Phone', master.officialPhoneNumber, false),
    item('appointmentLetterLink', 'Appointment Letter', master.appointmentLetterLink, false),
    item('discTest', 'DISC Test', master.discTest, false),
    item('rightHrApp', 'Right HR App', master.rightHrApp, false),
  ].map((row) => ({ ...row, status: row.ready ? 'AVAILABLE' : 'TO_BE_CREATED' }))

  const missingRequired = required.filter((row) => !row.ready)
  const pendingRequiredTasks = (ctx.tasks || []).filter((task) => task.required !== false && task.status !== 'COMPLETED')
  const allTasksDone = pendingRequiredTasks.length === 0
  const infoReady = ctx.preboarding.formStatus === FORM_STATUS.APPROVED || allTasksDone
  const docsReady = ctx.preboarding.verificationStatus === VERIFICATION_STATUS.COMPLETE || allTasksDone

  const preconditions = [
    { key: 'offerAccepted', label: 'Offer', status: ctx.offer?.status === OFFER_STATUS.ACCEPTED ? 'Accepted' : 'Pending', ready: ctx.offer?.status === OFFER_STATUS.ACCEPTED },
    { key: 'informationApproved', label: 'Information', status: infoReady ? 'Approved' : 'Pending', ready: infoReady },
    { key: 'documentsVerified', label: 'Documents', status: docsReady ? 'Verified' : 'Pending', ready: docsReady },
    { key: 'onboardingTasks', label: 'Onboarding Tasks', status: allTasksDone ? 'Complete' : `${pendingRequiredTasks.length} pending`, ready: allTasksDone },
    { key: 'employmentSetup', label: 'Employment Setup', status: missingRequired.length ? 'Pending' : 'Ready', ready: missingRequired.length === 0 },
    { key: 'payrollSetup', label: 'Payroll Setup', status: hasValue(master.ctc) ? 'Ready' : 'Pending', ready: hasValue(master.ctc) },
  ]
  const joined = ctx.preboarding.status === PREBOARDING_STATUS.JOINED || allTasksDone
  const mandatoryReady = allTasksDone || (missingRequired.length === 0 && preconditions.every((row) => row.ready))
  return {
    required,
    optional,
    preconditions,
    missingRequired,
    readinessPercentage: Math.round((required.filter((row) => row.ready).length / required.length) * 100),
    mandatoryReady,
    joined,
    readyToCreateEmployee: mandatoryReady && joined,
  }
}

export async function getEmployeeMasterPreview(tenantId, preboardingId) {
  const ctx = await loadConversionContext(tenantId, preboardingId)
  if (!ctx) return null
  const master = buildMasterRecord(ctx)
  const checklist = checklistFor(ctx, master)
  const duplicates = await findDuplicateEmployees(tenantId, master)
  return {
    ids: {
      candidateId: ctx.candidate?._id,
      applicationId: ctx.application?._id,
      jobId: ctx.job?._id,
      offerId: ctx.offer?._id,
      preboardingId: ctx.preboarding?._id,
    },
    candidate: ctx.candidate,
    application: ctx.application,
    job: ctx.job,
    offer: ctx.offer,
    preboarding: ctx.preboarding,
    master,
    checklist,
    duplicates,
    conversionStatus: ctx.preboarding.conversionStatus,
    convertedEmployeeId: ctx.preboarding.convertedEmployeeId,
  }
}

export async function findDuplicateEmployees(tenantId, master) {
  const or = []
  if (hasValue(master.panNumber)) or.push({ panNumber: master.panNumber })
  if (hasValue(master.personalEmail)) or.push({ personalEmail: master.personalEmail })
  if (hasValue(master.email)) or.push({ email: master.email })
  if (hasValue(master.phone)) or.push({ phone: master.phone })
  if (hasValue(master.aadhaarNumber)) or.push({ aadhaarNumber: master.aadhaarNumber })
  if (!or.length) return []
  const employees = await Employee.find({ tenantId, deleted: false, $or: or })
    .select('employeeCode firstName lastName email phone personalEmail panNumber aadhaarNumber')
    .limit(5)
    .lean()
  return employees.map((employee) => ({
    employee,
    matches: [
      hasValue(master.panNumber) && employee.panNumber === master.panNumber ? 'PAN' : null,
      hasValue(master.personalEmail) && employee.personalEmail === master.personalEmail ? 'Personal Email' : null,
      hasValue(master.email) && employee.email === master.email ? 'Login Email' : null,
      hasValue(master.phone) && employee.phone === master.phone ? 'Phone' : null,
      hasValue(master.aadhaarNumber) && employee.aadhaarNumber === master.aadhaarNumber ? 'Aadhaar' : null,
    ].filter(Boolean),
  }))
}

export async function syncReadinessStatus(tenantId, preboardingId) {
  const preview = await getEmployeeMasterPreview(tenantId, preboardingId)
  if (!preview) return null
  const employeeReadinessStatus = preview.checklist.readyToCreateEmployee
    ? EMPLOYEE_READINESS_STATUS.READY_TO_CREATE_EMPLOYEE
    : EMPLOYEE_READINESS_STATUS.NOT_READY
  const currentConversionStatus = preview.preboarding.conversionStatus
  const terminalOrBusy = [
    EMPLOYEE_CONVERSION_STATUS.PROCESSING,
    EMPLOYEE_CONVERSION_STATUS.COMPLETED,
  ].includes(currentConversionStatus)
  const conversionStatus = terminalOrBusy ? currentConversionStatus : preview.checklist.readyToCreateEmployee
    ? EMPLOYEE_CONVERSION_STATUS.READY
    : EMPLOYEE_CONVERSION_STATUS.NOT_READY
  await Preboarding.updateOne(
    { _id: preboardingId, tenantId },
    { $set: { employeeReadinessStatus, conversionStatus } }
  )
  preview.preboarding.employeeReadinessStatus = employeeReadinessStatus
  preview.preboarding.conversionStatus = conversionStatus
  preview.conversionStatus = conversionStatus
  return preview
}

async function generateEmployeeCode(ctx, session) {
  const prefix = ctx.tenant?.hrSettings?.employeeIdPrefix || ctx.tenant?.tenantCode || 'EMP'
  const companyCode = ctx.tenant?.tenantCode || prefix
  const year = new Date(ctx.preboarding.confirmedJoiningDate || ctx.preboarding.proposedJoiningDate || Date.now()).getFullYear()
  const next = await EmployeeCodeSequence.findOneAndUpdate(
    { tenantId: ctx.preboarding.tenantId, companyCode, year },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, session, setDefaultsOnInsert: true }
  )
  return `${prefix}-${year}-${String(next.sequence).padStart(4, '0')}`
}

export async function convertCandidateToEmployee(tenantId, preboardingId, actorSession, { overrideDuplicate = false } = {}) {
  const existingPreboarding = await Preboarding.findOne({ _id: preboardingId, tenantId, deleted: false })
  if (!existingPreboarding) {
    const error = new Error('Preboarding profile not found')
    error.status = 404
    throw error
  }
  if (existingPreboarding.conversionStatus === EMPLOYEE_CONVERSION_STATUS.COMPLETED && existingPreboarding.convertedEmployeeId) {
    const employee = await Employee.findById(existingPreboarding.convertedEmployeeId).select('-password')
    return { employee, alreadyCompleted: true }
  }

  const preview = await syncReadinessStatus(tenantId, preboardingId)
  if (!preview?.checklist.readyToCreateEmployee) {
    const error = new Error('Candidate is not READY_TO_CREATE_EMPLOYEE')
    error.status = 400
    error.errorCode = 'NOT_READY'
    error.details = preview?.checklist.missingRequired || []
    throw error
  }
  if (preview.duplicates.length && !overrideDuplicate) {
    const error = new Error('Possible existing employee found')
    error.status = 409
    error.errorCode = 'DUPLICATE_EMPLOYEE'
    error.duplicates = preview.duplicates
    throw error
  }

  const dbSession = await mongoose.startSession()
  try {
    let result = null
    await dbSession.withTransaction(async () => {
      const locked = await Preboarding.findOneAndUpdate(
        {
          _id: preboardingId,
          tenantId,
          conversionStatus: { $nin: [EMPLOYEE_CONVERSION_STATUS.PROCESSING, EMPLOYEE_CONVERSION_STATUS.COMPLETED] },
        },
        {
          $set: {
            conversionStatus: EMPLOYEE_CONVERSION_STATUS.PROCESSING,
            conversionStartedAt: new Date(),
            conversionError: null,
          },
        },
        { new: true, session: dbSession }
      )
      if (!locked) {
        const current = await Preboarding.findOne({ _id: preboardingId, tenantId }).session(dbSession)
        if (current?.conversionStatus === EMPLOYEE_CONVERSION_STATUS.COMPLETED && current.convertedEmployeeId) {
          const employee = await Employee.findById(current.convertedEmployeeId).select('-password').session(dbSession)
          result = { employee, alreadyCompleted: true }
          return
        }
        const error = new Error('Conversion is already processing or not ready')
        error.status = 409
        error.errorCode = 'CONVERSION_LOCKED'
        throw error
      }

      const ctx = await loadConversionContext(tenantId, preboardingId)
      ctx.preboarding = locked
      const employeeCode = await generateEmployeeCode(ctx, dbSession)
      const master = buildMasterRecord(ctx, employeeCode)
      const tempPassword = `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
      const employeePayload = {
        employeeCode: master.employeeCode,
        companyName: master.companyName,
        companyCode: master.companyCode,
        firstName: master.firstName,
        lastName: master.lastName,
        email: master.email,
        password: await hashPassword(tempPassword),
        phone: master.phone,
        alternatePhone: master.emergencyContactNumber,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        dateOfBirth: master.dateOfBirth,
        gender: master.gender,
        maritalStatus: master.maritalStatus,
        anniversaryDate: master.anniversaryDate,
        bloodGroup: master.bloodGroup,
        colorCode: master.colorCode,
        discTest: master.discTest,
        motherHead: master.motherHead,
        fatherName: master.fatherName,
        motherName: master.motherName,
        spouseName: master.spouseName,
        department: master.departmentId,
        designation: master.designationId,
        branch: master.locationId,
        shift: master.shiftId,
        reportingManager: master.reportingManagerId,
        hod: master.hodId,
        joiningDate: master.joiningDate,
        workLocation: master.location,
        areaZone: master.areaZone,
        workingHours: master.workingHours,
        inTiming: master.inTiming,
        weekOff: master.weekOff,
        workClassification: master.workClassification,
        employmentType: ctx.version?.employmentType,
        ctc: master.ctc,
        salaryTakeHome: master.salaryTakeHome,
        bankName: master.bankName,
        bankAccountNumber: master.bankAccountNumber,
        bankIfscCode: master.bankIfscCode,
        accountHolderName: master.accountHolderName,
        bankBranch: master.bankBranch,
        aadhaarNumber: master.aadhaarNumber,
        panNumber: master.panNumber,
        pfNumber: master.pfNumber,
        uanNumber: master.uanNumber,
        esiNumber: master.esiNumber,
        verifiedStatus: master.verifiedStatus,
        offerLetterLink: master.offerLetterLink,
        appointmentLetterLink: master.appointmentLetterLink,
        probationPeriod: master.probationPeriod,
        dateOfExit: null,
        remark: master.remark,
        rightHrApp: master.rightHrApp,
        address: master.currentAddress,
        currentAddress: master.currentAddress,
        permanentAddress: master.permanentAddress,
        state: master.state,
        country: master.country,
        personalEmail: master.personalEmail,
        officialEmail: master.officialEmail,
        officialPhoneNumber: master.officialPhoneNumber,
        emergencyContactNumber: master.emergencyContactNumber,
        emergencyPersonName: master.emergencyPersonName,
        profilePhotoUrl: ctx.personal?.profilePhotoUrl,
        sourceCandidateId: ctx.candidate?._id,
        sourceApplicationId: ctx.application?._id,
        sourceJobId: ctx.job?._id,
        sourceOfferId: ctx.offer?._id,
        sourcePreboardingId: locked._id,
        recruitmentSource: ctx.application?.source || ctx.candidate?.source || null,
        tenantId,
        createdBy: actorSession.sub,
      }
      const [employee] = await Employee.create([employeePayload], { session: dbSession })
      const annualCtc = Number(master.ctc || 0)
      if (annualCtc > 0) {
        await SalaryStructure.updateMany(
          { employee: employee._id, tenantId, isActive: true },
          { $set: { isActive: false, effectiveTo: master.joiningDate || new Date() } },
          { session: dbSession }
        )
        await SalaryStructure.create([{
          name: `${master.firstName} ${master.lastName} Salary Structure`,
          description: 'Auto-created from accepted offer during onboarding conversion',
          employee: employee._id,
          ctc: annualCtc,
          basicPercent: 40,
          hraPercent: 20,
          conveyanceAllowance: 1600,
          medicalAllowance: 1250,
          pfPercent: ctx.version?.pfEligible === false ? 0 : 12,
          esiPercent: ctx.version?.esiEligible === false ? 0 : 0.75,
          pfEligible: ctx.version?.pfEligible !== false,
          esiEligible: ctx.version?.esiEligible !== false,
          ptEligible: ctx.version?.ptEligible !== false,
          insuranceGroup: ctx.version?.insuranceGroup || null,
          approvalStatus: 'APPROVED',
          revisionNote: 'Created from onboarding conversion',
          effectiveFrom: master.joiningDate || new Date(),
          isActive: true,
          tenantId,
          createdBy: actorSession.sub,
        }], { session: dbSession })
      }

      await Promise.all([
        Application.updateOne({ _id: ctx.application?._id, tenantId }, {
          $set: { status: APPLICATION_STATUS.HIRED },
          $push: { activityLog: { type: 'STATUS_CHANGED', message: `Marked Hired after employee creation (${employee.employeeCode})`, actorId: actorSession.userId, actorName: actorSession.sub } },
        }, { session: dbSession }),
        Candidate.updateOne({ _id: ctx.candidate?._id, tenantId }, {
          $set: { status: CANDIDATE_STATUS.HIRED },
          $push: { activityLog: { type: 'STATUS_CHANGED', message: `Converted to employee ${employee.employeeCode}`, actorId: actorSession.userId, actorName: actorSession.sub } },
        }, { session: dbSession }),
        Job.updateOne({ _id: ctx.job?._id, tenantId }, {
          $inc: { filledOpenings: 1 },
          $push: { activityLog: { type: 'UPDATED', message: `Filled opening incremented by employee conversion (${employee.employeeCode})`, actorId: actorSession.userId, actorName: actorSession.sub } },
        }, { session: dbSession }),
        Preboarding.updateOne({ _id: locked._id, tenantId }, {
          $set: {
            status: PREBOARDING_STATUS.JOINED,
            conversionStatus: EMPLOYEE_CONVERSION_STATUS.COMPLETED,
            conversionCompletedAt: new Date(),
            convertedEmployeeId: employee._id,
          },
          $push: { activityLog: { type: 'EMPLOYEE_CREATED', message: `Employee Master created: ${employee.employeeCode}`, actorName: actorSession.sub } },
        }, { session: dbSession }),
      ])

      const refreshedJob = await Job.findById(ctx.job?._id).session(dbSession)
      const canMarkJobFilled = refreshedJob && refreshedJob.filledOpenings >= refreshedJob.totalOpenings && refreshedJob.status !== JOB_STATUS.FILLED
      result = {
        employee: employee.toObject(),
        tempPassword,
        alreadyCompleted: false,
        vacancy: refreshedJob ? {
          totalOpenings: refreshedJob.totalOpenings,
          filledOpenings: refreshedJob.filledOpenings,
          remainingOpenings: Math.max(0, refreshedJob.totalOpenings - refreshedJob.filledOpenings),
          canMarkJobFilled,
        } : null,
      }
      delete result.employee.password
    })
    return result
  } catch (err) {
    await Preboarding.updateOne(
      { _id: preboardingId, tenantId, conversionStatus: EMPLOYEE_CONVERSION_STATUS.PROCESSING },
      {
        $set: {
          conversionStatus: EMPLOYEE_CONVERSION_STATUS.FAILED,
          conversionFailedAt: new Date(),
          conversionError: err.message,
        },
      }
    ).catch(() => {})
    throw err
  } finally {
    await dbSession.endSession()
  }
}
