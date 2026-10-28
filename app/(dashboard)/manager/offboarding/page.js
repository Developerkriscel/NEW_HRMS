import { ManagerApprovalsWorkspace } from '@/components/pages/ManagerApprovalsWorkspace'

export default function ManagerOffboardingPage() {
  return (
    <ManagerApprovalsWorkspace
      title="Offboarding Approvals"
      subtitle="Review resignation requests from your direct reports"
      initialType="RESIGNATION"
      initialCategory="OTHER"
    />
  )
}
