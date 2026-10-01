export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import PlatformConfiguration from '@/models/PlatformConfiguration'
import { encryptSecret, decryptSecret } from '@/lib/platformSecurity'

const PLATFORM_AI_TYPE = 'REGISTRY'
const PLATFORM_AI_KEY = 'platform_ai_settings'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.settings.manage')

  const config = await PlatformConfiguration.findOne({
    type: PLATFORM_AI_TYPE,
    key: PLATFORM_AI_KEY,
    status: 'ACTIVE',
  }).sort({ version: -1 }).lean()

  const value = config?.value || {}
  const isConfigured = Boolean(value.apiKeyCiphertext || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)

  return ok({
    provider: value.provider || 'GEMINI',
    model: value.model || 'gemini-2.5-flash',
    apiKeyPreview: value.apiKeyPreview || (process.env.GEMINI_API_KEY ? 'ENV-Configured (GEMINI_API_KEY)' : null),
    isConfigured,
    updatedAt: config?.updatedAt || null,
    updatedBy: config?.updatedBy || null,
  })
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.settings.manage')

  const body = await req.json()
  const { provider, model, apiKey } = body

  if (!['GEMINI', 'OPENAI', 'GROK', 'MISTRAL'].includes(provider)) {
    return fail('Invalid AI provider selected', 400, 'INVALID_PROVIDER')
  }

  const defaultModel = provider === 'GROK' ? 'grok-2-latest'
    : provider === 'MISTRAL' ? 'mistral-large-latest'
    : provider === 'OPENAI' ? 'gpt-4o-mini'
    : 'gemini-2.5-flash'

  let config = await PlatformConfiguration.findOne({
    type: PLATFORM_AI_TYPE,
    key: PLATFORM_AI_KEY,
  }).sort({ version: -1 })

  if (!config) {
    config = new PlatformConfiguration({
      type: PLATFORM_AI_TYPE,
      key: PLATFORM_AI_KEY,
      name: 'Platform AI Integration Settings',
      status: 'ACTIVE',
      version: 1,
      value: {},
    })
  }

  const currentValue = config.value || {}
  const updatedValue = {
    ...currentValue,
    provider,
    model: model || defaultModel,
  }

  if (apiKey && apiKey.trim()) {
    const encrypted = encryptSecret(apiKey.trim())
    updatedValue.apiKeyCiphertext = encrypted.ciphertext
    updatedValue.apiKeyIv = encrypted.iv
    updatedValue.apiKeyTag = encrypted.tag
    updatedValue.apiKeyPreview = encrypted.preview
  }

  config.value = updatedValue
  config.status = 'ACTIVE'
  config.updatedBy = session.sub
  await config.save()

  await logSuperAdmin(session, {
    action: 'PLATFORM_AI_SETTINGS_UPDATED',
    entityType: 'PlatformConfiguration',
    entityId: config._id,
    description: `Super Admin updated platform AI provider to ${provider} (${updatedValue.model})`,
    req,
  })

  return ok({
    provider: updatedValue.provider,
    model: updatedValue.model,
    apiKeyPreview: updatedValue.apiKeyPreview || null,
    isConfigured: Boolean(updatedValue.apiKeyCiphertext),
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  }, 'Platform AI integration settings updated successfully')
})
