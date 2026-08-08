import { JobDetailPage } from '@/components/pages/recruitment/jobs/JobDetailPage'

export default function JobDetailRoute({ params }) {
  return <JobDetailPage jobId={params.id} />
}
