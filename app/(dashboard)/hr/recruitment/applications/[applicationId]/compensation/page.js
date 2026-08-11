import { CompensationPage } from '@/components/pages/recruitment/compensation/CompensationPage'

export default function CompensationRoute({ params }) {
  return <CompensationPage applicationId={params.applicationId} />
}
