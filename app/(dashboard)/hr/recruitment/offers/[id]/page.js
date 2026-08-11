import { OfferDetailPage } from '@/components/pages/recruitment/offers/OfferDetailPage'

export default function OfferDetailRoute({ params }) {
  return <OfferDetailPage offerId={params.id} />
}
