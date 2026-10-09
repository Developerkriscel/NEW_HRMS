import { AssetsWorkspace } from '@/components/pages/AssetsWorkspace'

export default function ManagerAssetsPage() {
  return (
    <AssetsWorkspace
      title="Assets"
      subtitle="View your assigned assets, request new ones, and report issues"
      employeeMode
    />
  )
}
