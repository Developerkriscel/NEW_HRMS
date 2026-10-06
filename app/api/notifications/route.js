import { withApi } from '@/lib/handler'
import { requireAuth } from '@/lib/auth'
import { ok, fail } from '@/lib/apiResponse'
import { getPanelNotifications, createNotification } from '@/lib/notifications'

export const GET = withApi(async () => {
  const session = await requireAuth()
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok({ notifications: [], unreadCount: 0 })
  }
  const data = await getPanelNotifications(session)
  return ok(data)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const body = await req.json()

  if (!body.title || !body.message) {
    return fail('Title and message are required', 400, 'VALIDATION_ERROR')
  }

  // Non-super-admins can only create notifications within their tenant
  const tenant = session.isSuperAdmin ? (body.tenant || null) : session.tenantId

  const notification = await createNotification({
    userId: body.userId || null,
    targetRole: body.targetRole || 'ALL',
    tenant,
    title: body.title,
    message: body.message,
    type: body.type || 'info',
    category: body.category || 'general',
    link: body.link || null,
    metadata: body.metadata || {},
  })

  return ok(notification, 'Notification created', 201)
})
