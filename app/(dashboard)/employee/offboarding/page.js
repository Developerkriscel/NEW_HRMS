'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeeOffboardingWorkspace = dynamic(
  () => import('@/components/pages/EmployeeOffboardingWorkspace').then((mod) => mod.EmployeeOffboardingWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function EmployeeOffboardingPage() {
  return <EmployeeOffboardingWorkspace />
}
