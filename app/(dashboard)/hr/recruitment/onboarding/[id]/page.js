import { OnboardingDetailPage } from '@/components/pages/recruitment/onboarding/OnboardingDetailPage'

export default function OnboardingDetailRoute({ params }) {
  return <OnboardingDetailPage id={params.id} />
}
