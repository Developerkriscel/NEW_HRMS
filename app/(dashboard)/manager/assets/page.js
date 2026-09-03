'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const AssetsWorkspace = dynamic(
  () => import('@/components/pages/AssetsWorkspace').then((mod) => mod.AssetsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function ManagerAssetsPage() {
  return (
    <AssetsWorkspace
      title="Assets"
      subtitle="View your assigned assets, request new ones, and report issues"
      employeeMode
    />
  )
}
