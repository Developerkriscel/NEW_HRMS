import { AssessmentForm } from '@/components/pages/recruitment/assessments/AssessmentForm'

export default function EditAssessmentRoute({ params }) {
  return <AssessmentForm assessmentId={params.id} />
}
