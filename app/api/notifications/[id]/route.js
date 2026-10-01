import { withApi } from '@/lib/handler'
import { requireAuth } from '@/lib/auth'
import { ok } from '@/lib/apiResponse'
import Notification from '@/models/Notification'

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const { id } = params
  const userId = String(session.userId || session.id || '')

  if (!id) return ok({ success: true })

  const isDbNotification = /^[a-f\d]{24}$/i.test(id)

  if (isDbNotification) {
    await Notification.findByIdAndDelete(id)
  } else {
    // Dismiss live synthetic notification by marking read
    await Notification.findOneAndUpdate(
      { userId, 'metadata.syntheticId': id },
      {
        $set: { read: true, readAt: new Date() },
        $setOnInsert: {
          userId,
          targetRole: session.role || 'ALL',
          title: 'Dismissed Marker',
          message: id,
          metadata: { synthetic: true, syntheticId: id },
        },
      },
      { upsert: true }
    )
  }

  return ok({ success: true, id })
})
