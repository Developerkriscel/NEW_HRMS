import { CandidateAssessmentPortal } from '@/components/pages/assessment/CandidateAssessmentPortal'

export default function CandidateAssessmentRoute({ params }) {
  return <CandidateAssessmentPortal token={params.token} />
}
