export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import PlatformConfiguration from '@/models/PlatformConfiguration'
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_KEY,
  PLATFORM_SETTINGS_TYPE,
  getPlatformSettings,
  mergePlatformSettings,
  sanitizePlatformSettings,
  validatePlatformSettings,
} from '@/lib/platformSettings'

const devStore = global.__nexahrSuperAdminSettings || {
  settings: DEFAULT_PLATFORM_SETTINGS,
  updatedAt: null,
  updatedBy: null,
  version: 1,
}
global.__nexahrSuperAdminSettings = devStore

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.dashboard.view')

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok({ ...devStore, settings: mergePlatformSettings(devStore.settings), editable: true })
  }

  const data = await getPlatformSettings()
  return ok({
    settings: data.settings,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    version: data.version,
    editable: true,
  })
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.settings.manage')

  const payload = await req.json()
  const settings = sanitizePlatformSettings(payload?.settings || payload)
  const validationError = validatePlatformSettings(settings)
  if (validationError) return fail(validationError, 400, 'VALIDATION_ERROR')

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    devStore.settings = settings
    devStore.updatedAt = new Date().toISOString()
    devStore.updatedBy = session.sub
    return ok({ ...devStore, editable: true }, 'Platform settings saved')
  }

  let config = await PlatformConfiguration.findOne({
    type: PLATFORM_SETTINGS_TYPE,
    key: PLATFORM_SETTINGS_KEY,
    version: 1,
  })

  if (!config) {
    config = new PlatformConfiguration({
      type: PLATFORM_SETTINGS_TYPE,
      key: PLATFORM_SETTINGS_KEY,
      name: 'Platform Settings',
      version: 1,
      status: 'ACTIVE',
    })
  }

  const oldValue = config.value || null
  config.value = settings
  config.status = 'ACTIVE'
  config.updatedBy = session.sub
  await config.save()

  await logSuperAdmin(session, {
    action: 'PLATFORM_SETTINGS_UPDATED',
    entityType: 'PlatformConfiguration',
    entityId: config._id,
    description: 'Platform organization defaults updated',
    oldValue: oldValue ? JSON.stringify(oldValue) : null,
    newValue: JSON.stringify(settings),
    req,
  })

  return ok({
    settings: mergePlatformSettings(config.value),
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
    version: config.version,
    editable: true,
  }, 'Platform settings saved')
})
