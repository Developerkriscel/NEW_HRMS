import { SelectionDecisionPage } from '@/components/pages/recruitment/selections/SelectionDecisionPage'

export default function SelectionDecisionRoute({ params }) {
  return <SelectionDecisionPage applicationId={params.applicationId} />
}
