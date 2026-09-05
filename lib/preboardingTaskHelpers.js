import PreboardingTask from '@/models/PreboardingTask'

const DEFAULT_TASKS = [
  { name: 'Information Form Approval', assignedTo: 'HR Department', priority: 'High', required: true },
  { name: 'Document Verification', assignedTo: 'HR Department', priority: 'High', required: true },
  { name: 'Joining Confirmation', assignedTo: 'HR Department', priority: 'Medium', required: true },
  { name: 'Payroll & Access Setup', assignedTo: 'HR Department', priority: 'Medium', required: false },
]

export async function ensureDefaultPreboardingTasks(tenantId, preboarding) {
  const existingCount = await PreboardingTask.countDocuments({ tenantId, preboardingId: preboarding._id, deleted: false })
  if (existingCount > 0) return

  const dueDate = preboarding.confirmedJoiningDate || preboarding.proposedJoiningDate || null
  await PreboardingTask.insertMany(DEFAULT_TASKS.map((task) => ({
    tenantId,
    preboardingId: preboarding._id,
    dueDate,
    ...task,
  })))
}
