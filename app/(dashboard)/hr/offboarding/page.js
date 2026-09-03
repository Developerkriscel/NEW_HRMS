'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const OffboardingWorkspace = dynamic(
  () => import('@/components/pages/OffboardingWorkspace').then((mod) => mod.OffboardingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function OffboardingPage() {
  return <OffboardingWorkspace />
}
