// Preconditions checked before a publish request even reaches the
// connectors — these are properties of the Job itself, not any one
// channel, so a failure here blocks the whole request (unlike a
// disconnected external channel, which only fails that one channel).
export function validatePublishPreconditions(job) {
  const errors = {}

  if (job.status !== 'OPEN') {
    errors.status = 'Only an OPEN job can be published'
  }

  const effectiveTitle = job.publicTitle || job.jobTitle
  if (!effectiveTitle || !effectiveTitle.trim()) {
    errors.publicTitle = 'A public job title is required before publishing'
  }

  const effectiveDescription = job.publicDescription || job.jobSummary
  if (!effectiveDescription || !effectiveDescription.trim()) {
    errors.publicDescription = 'A public job description is required before publishing'
  }

  if (job.applicationDeadline) {
    const deadline = new Date(job.applicationDeadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (deadline < today) errors.applicationDeadline = 'Application deadline has already passed'
  }

  return errors
}
