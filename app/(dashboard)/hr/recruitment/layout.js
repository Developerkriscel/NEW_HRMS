import { RecruitmentSidebar } from '@/components/pages/recruitment/RecruitmentSidebar'

export default function RecruitmentLayout({ children }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <RecruitmentSidebar />
      <div className="flex-1 min-w-0 w-full">{children}</div>
    </div>
  )
}
