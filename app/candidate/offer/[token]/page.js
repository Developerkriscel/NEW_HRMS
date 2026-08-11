import { CandidateOfferPortal } from '@/components/pages/offer/CandidateOfferPortal'

export default function CandidateOfferRoute({ params }) {
  return <CandidateOfferPortal token={params.token} />
}
