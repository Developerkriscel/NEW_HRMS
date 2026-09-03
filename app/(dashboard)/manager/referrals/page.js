'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const EmployeeReferralsPage = dynamic(
  () => import('@/components/pages/employee/EmployeeReferralsPage').then((mod) => mod.EmployeeReferralsPage),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerReferralsPage() {
  return <EmployeeReferralsPage />
}
