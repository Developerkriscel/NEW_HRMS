import { CandidatePreboardingPortal } from '@/components/pages/preboarding/CandidatePreboardingPortal'

export default function CandidatePreboardingRoute({ params }) {
  return <CandidatePreboardingPortal token={params.token} />
}
