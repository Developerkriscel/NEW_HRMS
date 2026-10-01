import { withApi } from '@/lib/handler'
import { requireAuth } from '@/lib/auth'
import { ok } from '@/lib/apiResponse'
import Notification from '@/models/Notification'

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const { id } = params
  const userId = String(session.userId || session.id || '')

  if (!id) {
    return ok({ success: true })
  }

  // Check if it's a persistent DB notification (24-char ObjectId)
  const isDbNotification = /^[a-f\d]{24}$/i.test(id)

  if (isDbNotification) {
    await Notification.findByIdAndUpdate(id, {
      $set: { read: true, readAt: new Date() },
      $addToSet: { readBy: userId },
    })
  } else {
    // Live synthetic notification or starter notification
    await Notification.findOneAndUpdate(
      {
        userId,
        'metadata.syntheticId': id,
      },
      {
        $setOnInsert: {
          userId,
          targetRole: session.role || 'ALL',
          title: 'Live Read Marker',
          message: id,
          read: true,
          readAt: new Date(),
          metadata: { synthetic: true, syntheticId: id },
        },
      },
      { upsert: true }
    )
  }

  return ok({ success: true, id })
})
