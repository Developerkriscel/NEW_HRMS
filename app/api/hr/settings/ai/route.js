export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { encryptSecret } from '@/lib/platformSecurity'
import Tenant from '@/models/Tenant'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER'])
  const tenantId = requireTenantId(session)

  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).lean()
  if (!tenant) return ok(null, 'Tenant not found', 404)

  const aiSettings = tenant.aiSettings || { provider: 'GEMINI', model: 'gemini-2.5-flash', apiKeyPreview: null }
  
  return ok({
    provider: aiSettings.provider,
    model: aiSettings.model,
    apiKeyPreview: aiSettings.apiKeyPreview || null
  })
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER'])
  const tenantId = requireTenantId(session)

  const body = await req.json()
  const { provider, apiKey, model } = body

  if (!['GEMINI', 'OPENAI', 'GROK', 'MISTRAL'].includes(provider)) {
    return ok(null, 'Invalid provider', 400)
  }

  const updatePayload = {
    'aiSettings.provider': provider,
    'aiSettings.model': model || (
      provider === 'GROK' ? 'grok-2-latest'
        : provider === 'MISTRAL' ? 'mistral-large-latest'
          : provider === 'OPENAI' ? 'gpt-4o-mini'
            : 'gemini-2.5-flash'
    )
  }

  if (apiKey) {
    const encrypted = encryptSecret(apiKey)
    updatePayload['aiSettings.apiKeyCiphertext'] = encrypted.ciphertext
    updatePayload['aiSettings.apiKeyIv'] = encrypted.iv
    updatePayload['aiSettings.apiKeyTag'] = encrypted.tag
    updatePayload['aiSettings.apiKeyPreview'] = encrypted.preview
  }

  const tenant = await Tenant.findOneAndUpdate(
    { _id: tenantId, deleted: false },
    { $set: updatePayload },
    { new: true, runValidators: true }
  )

  await logAction(session, { 
    action: 'AI_SETTINGS_UPDATED', 
    entityType: 'Tenant', 
    entityId: tenant._id, 
    description: `AI provider updated to ${provider}`, 
    req 
  })

  return ok({
    provider: tenant.aiSettings?.provider,
    model: tenant.aiSettings?.model,
    apiKeyPreview: tenant.aiSettings?.apiKeyPreview
  }, 'AI integration settings saved')
})
