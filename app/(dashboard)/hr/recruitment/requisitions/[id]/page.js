import { RequisitionDetailPage } from '@/components/pages/recruitment/RequisitionDetailPage'

export default function RequisitionDetailRoute({ params }) {
  return <RequisitionDetailPage requisitionId={params.id} />
}
