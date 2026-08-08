import { JobForm } from '@/components/pages/recruitment/jobs/JobForm'

export default function EditJobPage({ params }) {
  return <JobForm jobId={params.id} />
}
