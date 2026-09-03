'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const ManagerReportsWorkspace = dynamic(
  () => import('@/components/pages/ManagerReportsWorkspace').then((mod) => mod.ManagerReportsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerReportsPage() {
  return <ManagerReportsWorkspace />
}
