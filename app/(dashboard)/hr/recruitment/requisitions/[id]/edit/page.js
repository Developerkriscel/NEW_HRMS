import { RequisitionForm } from '@/components/pages/recruitment/RequisitionForm'

export default function EditRequisitionPage({ params }) {
  return <RequisitionForm requisitionId={params.id} />
}
