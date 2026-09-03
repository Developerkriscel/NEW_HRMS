'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const ReportsHub = dynamic(
  () => import('@/components/pages/ReportsHub').then((mod) => mod.ReportsHub),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function CompanyReportsPage() {
  return <ReportsHub />
}
