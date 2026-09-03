'use client'

import dynamic from 'next/dynamic'
import { PageLoader } from '@/components/common/LoadingSpinner'

const AssetsWorkspace = dynamic(
  () => import('@/components/pages/AssetsWorkspace').then((mod) => mod.AssetsWorkspace),
  { ssr: false, loading: () => <PageLoader /> }
)

export default function HRAssetsPage() {
  return (
    <AssetsWorkspace
      title="Assets"
      subtitle="Review asset assignments and employee asset requests"
      reviewMode
    />
  )
}
