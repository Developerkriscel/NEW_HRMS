import { CandidateDetailPage } from '@/components/pages/recruitment/candidates/CandidateDetailPage'

export default function CandidateDetailRoute({ params }) {
  return <CandidateDetailPage candidateId={params.candidateId} />
}
