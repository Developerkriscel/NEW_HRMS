import { ApplicationDetailPage } from '@/components/pages/recruitment/candidates/ApplicationDetailPage'

export default function ApplicationDetailRoute({ params }) {
  return <ApplicationDetailPage applicationId={params.applicationId} />
}
