import { CareersListingPage } from '@/components/pages/careers/CareersListingPage'

export default function CareersPage({ params }) {
  return <CareersListingPage companySlug={params.companySlug} />
}
