import { InterviewDetailPage } from '@/components/pages/recruitment/interviews/InterviewDetailPage'

export default function InterviewDetailRoute({ params }) {
  return <InterviewDetailPage interviewId={params.id} />
}
