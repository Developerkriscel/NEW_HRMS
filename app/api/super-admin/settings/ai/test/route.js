export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import PlatformConfiguration from '@/models/PlatformConfiguration'
import { decryptSecret } from '@/lib/platformSecurity'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'

const PLATFORM_AI_TYPE = 'REGISTRY'
const PLATFORM_AI_KEY = 'platform_ai_settings'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'platform.settings.manage')

  const body = await req.json()
  let { provider, model, apiKey } = body

  if (!provider) provider = 'GEMINI'
  if (!model) {
    model = provider === 'GROK' ? 'grok-2-latest'
      : provider === 'MISTRAL' ? 'mistral-large-latest'
      : provider === 'OPENAI' ? 'gpt-4o-mini'
      : 'gemini-2.5-flash'
  }

  // If no apiKey passed, attempt to load saved key from DB or ENV
  if (!apiKey || !apiKey.trim()) {
    const config = await PlatformConfiguration.findOne({
      type: PLATFORM_AI_TYPE,
      key: PLATFORM_AI_KEY,
      status: 'ACTIVE',
    }).sort({ version: -1 }).lean()

    if (config?.value?.apiKeyCiphertext) {
      try {
        apiKey = decryptSecret(
          config.value.apiKeyCiphertext,
          config.value.apiKeyIv,
          config.value.apiKeyTag
        )
      } catch (err) {
        return fail('Failed to decrypt saved API key: ' + err.message, 500, 'DECRYPTION_ERROR')
      }
    } else if (provider === 'GEMINI' && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY
    } else if (provider === 'OPENAI' && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY
    }
  }

  if (!apiKey || !apiKey.trim()) {
    return fail('No API key provided or found in platform settings to test', 400, 'MISSING_API_KEY')
  }

  const startTime = Date.now()

  try {
    if (provider === 'OPENAI') {
      const client = new OpenAI({ apiKey: apiKey.trim() })
      const res = await client.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Respond with the single word "Connected".' }],
        max_tokens: 5,
        temperature: 0,
      })
      const latencyMs = Date.now() - startTime
      const reply = res.choices?.[0]?.message?.content?.trim() || 'OK'
      return ok({
        success: true,
        latencyMs,
        provider,
        model,
        reply,
        message: `Successfully connected to OpenAI (${model}) in ${latencyMs}ms.`,
      })
    } else if (provider === 'GROK') {
      const client = new OpenAI({
        apiKey: apiKey.trim(),
        baseURL: 'https://api.x.ai/v1',
      })
      const res = await client.chat.completions.create({
        model: model || 'grok-2-latest',
        messages: [{ role: 'user', content: 'Respond with the single word "Connected".' }],
        max_tokens: 5,
        temperature: 0,
      })
      const latencyMs = Date.now() - startTime
      const reply = res.choices?.[0]?.message?.content?.trim() || 'OK'
      return ok({
        success: true,
        latencyMs,
        provider,
        model,
        reply,
        message: `Successfully connected to Grok AI (${model}) in ${latencyMs}ms.`,
      })
    } else if (provider === 'MISTRAL') {
      const client = new OpenAI({
        apiKey: apiKey.trim(),
        baseURL: 'https://api.mistral.ai/v1',
      })
      const res = await client.chat.completions.create({
        model: model || 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Respond with the single word "Connected".' }],
        max_tokens: 5,
        temperature: 0,
      })
      const latencyMs = Date.now() - startTime
      const reply = res.choices?.[0]?.message?.content?.trim() || 'OK'
      return ok({
        success: true,
        latencyMs,
        provider,
        model,
        reply,
        message: `Successfully connected to Mistral AI (${model}) in ${latencyMs}ms.`,
      })
    } else {
      // GEMINI
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() })
      const res = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: 'Respond with the single word "Connected".',
      })
      const latencyMs = Date.now() - startTime
      const reply = res.text?.trim() || 'OK'
      return ok({
        success: true,
        latencyMs,
        provider,
        model,
        reply,
        message: `Successfully connected to Google Gemini (${model}) in ${latencyMs}ms.`,
      })
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const errorMessage = err.response?.data?.error?.message || err.message || 'Connection test failed'
    return fail(
      `AI Connection test failed (${provider}): ${errorMessage}`,
      400,
      'CONNECTION_FAILED',
      { latencyMs, provider, model }
    )
  }
})
