import { withApi } from '@/lib/handler'
import { requireAuth } from '@/lib/auth'
import { ok } from '@/lib/apiResponse'
import Notification from '@/models/Notification'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const userId = String(session.userId || session.id || '')

  let body = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const { syntheticIds = [] } = body

  // Mark all relevant DB notifications as read
  await Notification.updateMany(
    {
      $or: [
        { userId },
        { targetRole: session.role },
        { targetRole: 'ALL' },
      ],
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
      $addToSet: { readBy: userId },
    }
  )

  // Mark provided synthetic IDs as read
  if (Array.isArray(syntheticIds) && syntheticIds.length > 0) {
    const writes = syntheticIds.map((syncId) => ({
      updateOne: {
        filter: { userId, 'metadata.syntheticId': syncId },
        update: {
          $setOnInsert: {
            userId,
            targetRole: session.role || 'ALL',
            title: 'Live Read Marker',
            message: syncId,
            read: true,
            readAt: new Date(),
            metadata: { synthetic: true, syntheticId: syncId },
          },
        },
        upsert: true,
      },
    }))

    await Notification.bulkWrite(writes, { ordered: false }).catch(() => {})
  }

  return ok({ success: true, message: 'All notifications marked as read' })
})
