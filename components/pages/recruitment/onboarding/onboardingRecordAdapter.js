function fullName(person) {
  if (!person) return 'Unknown Candidate'
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.name || 'Unknown Candidate'
}

function normalizeUiStatus(status, conversionStatus) {
  if (conversionStatus === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'CANCELLED'
  if (status === 'ACCEPTED') return 'NOT_STARTED'
  return 'IN_PROGRESS'
}

function normalizeDocumentStatus(status) {
  if (['VERIFIED', 'WAIVED'].includes(status)) return 'VERIFIED'
  if (['UPLOADED', 'UNDER_REVIEW'].includes(status)) return 'PENDING_VERIFICATION'
  if (status === 'REJECTED' || status === 'REPLACEMENT_REQUIRED') return 'REJECTED'
  return 'NOT_SUBMITTED'
}

function buildTasks(preboarding) {
  if (Array.isArray(preboarding.tasks) && preboarding.tasks.length) {
    return preboarding.tasks.map((task) => ({
      id: String(task._id || task.id),
      name: task.name || 'Task',
      assignedTo: task.assignedTo || 'HR Department',
      dueDate: task.dueDate || '',
      priority: task.priority || 'Medium',
      required: task.required !== false,
      status: task.status || 'PENDING',
    }))
  }

  const joiningDate = preboarding.confirmedJoiningDate || preboarding.proposedJoiningDate || preboarding.joiningDate || ''
  return [
    {
      id: 'information',
      name: 'Information Form Approval',
      assignedTo: 'HR Department',
      dueDate: joiningDate,
      priority: 'High',
      required: true,
      status: preboarding.formStatus === 'APPROVED' ? 'COMPLETED' : 'PENDING',
    },
    {
      id: 'documents',
      name: 'Document Verification',
      assignedTo: 'HR Department',
      dueDate: joiningDate,
      priority: 'High',
      required: true,
      status: preboarding.verificationStatus === 'COMPLETE' ? 'COMPLETED' : 'PENDING',
    },
    {
      id: 'joining',
      name: 'Joining Confirmation',
      assignedTo: 'HR Department',
      dueDate: joiningDate,
      priority: 'Medium',
      required: true,
      status: ['READY_TO_JOIN', 'JOINED'].includes(preboarding.status) ? 'COMPLETED' : 'PENDING',
    },
  ]
}

function buildDocuments(preboarding) {
  if (Array.isArray(preboarding.documents)) {
    return preboarding.documents.map((doc) => ({
      id: String(doc._id || doc.id),
      name: doc.name || doc.requirementName || 'Document',
      required: doc.isRequired !== false,
      status: normalizeDocumentStatus(doc.status),
      uploadedAt: doc.currentVersionId?.uploadedAt || doc.updatedAt || doc.createdAt,
      verifiedBy: doc.verifiedByName || doc.currentVersionId?.verifiedByName || null,
      category: doc.category,
      fileUrl: doc.currentVersionId?.storageKey && preboarding.tenantId
        ? `/api/recruitment/onboarding/documents/files/${preboarding.tenantId}/${doc.currentVersionId.storageKey}`
        : null,
    }))
  }

  const required = Number(preboarding.documentsRequired || 0)
  const verified = Number(preboarding.verified || 0)
  return Array.from({ length: required }).map((_, index) => ({
    id: `document-${index + 1}`,
    name: `Required Document ${index + 1}`,
    required: true,
    status: index < verified ? 'VERIFIED' : 'NOT_SUBMITTED',
  }))
}

function buildActivities(preboarding) {
  const activityLog = Array.isArray(preboarding.activityLog) ? preboarding.activityLog : []
  if (!activityLog.length) {
    return [{ id: 'created', action: 'Onboarding profile loaded from database', user: 'System', timestamp: preboarding.createdAt || new Date().toISOString() }]
  }
  return activityLog.map((activity, index) => ({
    id: String(activity._id || `${activity.type || 'activity'}-${index}`),
    action: activity.message || activity.type || 'Activity',
    user: activity.actorName || 'System',
    timestamp: activity.createdAt || preboarding.updatedAt || preboarding.createdAt,
  }))
}

function progressFromRecord(documents, tasks) {
  const requiredDocs = documents.filter((doc) => doc.required)
  const verifiedDocs = requiredDocs.filter((doc) => doc.status === 'VERIFIED').length
  
  const requiredTasks = tasks.filter((task) => task.required)
  const completedTasks = requiredTasks.filter((task) => task.status === 'COMPLETED').length
  
  const totalRequired = requiredDocs.length + requiredTasks.length
  if (totalRequired === 0) return 100
  
  return Math.round(((verifiedDocs + completedTasks) / totalRequired) * 100)
}

export function adaptPreboardingRecord(source) {
  const preboarding = source || {}
  const candidate = preboarding.candidateId && typeof preboarding.candidateId === 'object'
    ? preboarding.candidateId
    : {
      _id: preboarding.candidateId,
      candidateCode: preboarding.candidateCode,
      firstName: preboarding.candidateName,
      email: preboarding.candidateEmail,
      phone: preboarding.candidatePhone,
    }

  const documents = buildDocuments(preboarding)
  const tasks = buildTasks(preboarding)
  const offer = preboarding.offer || {}
  const branch = preboarding.branch || offer.branch || null
  const shift = preboarding.shift || offer.shift || null
  const joiningDate = preboarding.confirmedJoiningDate || preboarding.proposedJoiningDate || preboarding.joiningDate || offer.joiningDate || ''
  const candidateName = fullName(candidate)

  return {
    raw: preboarding,
    rawStatus: preboarding.status,
    conversionStatus: preboarding.conversionStatus,
    convertedEmployeeId: preboarding.convertedEmployeeId,
    canConvert: preboarding.conversionStatus === 'READY' || preboarding.status === 'READY_TO_JOIN' || preboarding.status === 'JOINED',
    id: String(preboarding._id || preboarding.preboardingId || preboarding.id),
    candidate: {
      id: candidate.candidateCode || String(candidate._id || preboarding.candidateId || ''),
      name: candidateName,
      email: candidate.email || '',
      phone: candidate.phone || '',
      avatar: null,
    },
    position: offer.jobTitle || preboarding.jobTitle || preboarding.jobId?.publicTitle || preboarding.jobId?.jobTitle || 'Offered Role',
    department: offer.department || preboarding.department || '',
    departmentId: offer.departmentId || preboarding.departmentId || '',
    designation: offer.designation || preboarding.designation || '',
    designationId: offer.designationId || preboarding.designationId || '',
    employmentType: offer.employmentType || preboarding.employmentType || 'Full Time',
    workMode: offer.workMode || preboarding.workMode || 'On-site',
    workLocation: offer.location || preboarding.workLocation || '',
    locationId: offer.locationId || preboarding.locationId || '',
    branch,
    shift,
    reportingManager: offer.reportingManager || preboarding.reportingManager || '',
    onboardingOwner: preboarding.createdByName || preboarding.onboardingOwner || 'HR',
    joiningDate,
    status: normalizeUiStatus(preboarding.status, preboarding.conversionStatus),
    progress: progressFromRecord(documents, tasks),
    createdAt: preboarding.createdAt,
    formStatus: preboarding.formStatus,
    verificationStatus: preboarding.verificationStatus,
    tasks,
    documents,
    activities: buildActivities(preboarding),
    offer,
    ctc: offer.ctc || preboarding.ctc || '',
    salaryStructure: offer.salaryStructure || preboarding.salaryStructure || 'Standard Bracket',
    pfEligible: offer.pfEligible,
    esiEligible: offer.esiEligible,
    ptEligible: offer.ptEligible,
    insuranceGroup: offer.insuranceGroup || preboarding.insuranceGroup || '',
  }
}
