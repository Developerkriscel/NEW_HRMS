'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Radio,
  Eye,
  EyeOff,
  Zap,
  Cpu,
  Bot,
  FileText,
  Activity,
  ShieldCheck,
  RotateCw
} from 'lucide-react'
import api from '@/services/api'

const PROVIDER_OPTIONS = [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    description: 'Ultra-fast multimodal reasoning with expansive context windows.',
    tag: 'Recommended',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Fastest & highly cost-effective (Default)' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', hint: 'Complex reasoning & long context' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', hint: 'Balanced general capability' },
    ],
  },
  {
    id: 'OPENAI',
    name: 'OpenAI',
    description: 'Industry standard for structured outputs and language models.',
    tag: 'Popular',
    tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', hint: 'High speed and affordable intelligence' },
      { id: 'gpt-4o', label: 'GPT-4o', hint: 'Flagship omni model with highest accuracy' },
    ],
  },
  {
    id: 'GROK',
    name: 'Grok AI (xAI)',
    description: 'Advanced real-time intelligence and candid conversational reasoning.',
    tag: 'Modern',
    tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    models: [
      { id: 'grok-2-latest', label: 'Grok 2 Latest', hint: 'Balanced and highly capable reasoning' },
      { id: 'grok-2-vision-latest', label: 'Grok 2 Vision', hint: 'Visual & multimodal analysis' },
      { id: 'grok-beta', label: 'Grok Beta', hint: 'Preview experimental engine' },
    ],
  },
  {
    id: 'MISTRAL',
    name: 'Mistral AI',
    description: 'Open-weights & frontier European enterprise models.',
    tag: 'Enterprise',
    tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large Latest', hint: 'Top-tier reasoning & multilingual' },
      { id: 'mistral-small-latest', label: 'Mistral Small Latest', hint: 'Fast, responsive, and lightweight' },
      { id: 'pixtral-12b-2409', label: 'Pixtral 12B', hint: 'Multimodal vision specialist' },
    ],
  },
]

export function SuperAdminAiIntegrationSection() {
  const [provider, setProvider] = useState('GEMINI')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [customModel, setCustomModel] = useState('')
  const [useCustomModel, setUseCustomModel] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyPreview, setApiKeyPreview] = useState(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await api.get('/super-admin/settings/ai')
      if (res.data?.data) {
        const prov = res.data.data.provider || 'GEMINI'
        setProvider(prov)
        const currentModel = res.data.data.model || 'gemini-2.5-flash'
        const matchedProvider = PROVIDER_OPTIONS.find((p) => p.id === prov)
        const knownModel = matchedProvider?.models.some((m) => m.id === currentModel)

        if (knownModel) {
          setModel(currentModel)
          setUseCustomModel(false)
        } else {
          setCustomModel(currentModel)
          setUseCustomModel(true)
        }

        setApiKeyPreview(res.data.data.apiKeyPreview || null)
        setIsConfigured(Boolean(res.data.data.isConfigured))
        setUpdatedAt(res.data.data.updatedAt)
      }
    } catch (err) {
      console.error('Failed to fetch Super Admin AI settings', err)
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load AI settings' })
    } finally {
      setLoading(false)
    }
  }

  function handleProviderSelect(provId) {
    setProvider(provId)
    const prov = PROVIDER_OPTIONS.find((p) => p.id === provId)
    if (prov && prov.models.length > 0) {
      setModel(prov.models[0].id)
      setUseCustomModel(false)
      setCustomModel('')
    }
    setTestResult(null)
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    setMessage({ type: '', text: '' })

    const activeModel = useCustomModel && customModel.trim() ? customModel.trim() : model

    try {
      const res = await api.post('/super-admin/settings/ai/test', {
        provider,
        model: activeModel,
        apiKey: apiKey.trim() || undefined,
      })

      setTestResult({
        success: true,
        latencyMs: res.data?.data?.latencyMs || 0,
        message: res.data?.message || 'Connection test successful!',
        reply: res.data?.data?.reply,
      })
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Connection test failed'
      setTestResult({
        success: false,
        message: errMsg,
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    setTestResult(null)

    const activeModel = useCustomModel && customModel.trim() ? customModel.trim() : model

    try {
      const res = await api.put('/super-admin/settings/ai', {
        provider,
        model: activeModel,
        apiKey: apiKey.trim() || undefined,
      })

      setMessage({ type: 'success', text: res.data?.message || 'AI integration settings saved successfully!' })
      setApiKey('') // Clear raw input field for security
      if (res.data?.data?.apiKeyPreview) {
        setApiKeyPreview(res.data.data.apiKeyPreview)
      }
      setIsConfigured(true)
      setUpdatedAt(res.data?.data?.updatedAt || new Date().toISOString())
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save AI settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <RotateCw className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Loading AI Intelligence Engine settings...</p>
        </div>
      </div>
    )
  }

  const currentProviderObj = PROVIDER_OPTIONS.find((p) => p.id === provider) || PROVIDER_OPTIONS[0]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Overview Card */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-purple-50/30 p-6 sm:p-8 dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/20">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Platform AI Intelligence Engine
                </h2>
                {isConfigured ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active & Operational
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Pending Setup
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-normal max-w-2xl leading-relaxed">
                Centralized Super Admin control for the platform's artificial intelligence. Configures the provider (Google Gemini, OpenAI, Grok, Mistral) that powers candidate resume parsing, job compatibility scoring, and automated HR intelligence across all organizations.
              </p>
              {updatedAt && (
                <p className="mt-2 text-[11px] text-slate-400 font-normal">
                  Last configured: {new Date(updatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message.text && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-xs font-medium border ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Test Connection Live Result */}
      {testResult && (
        <div
          className={`flex flex-col gap-2 rounded-2xl p-4 text-xs font-medium border ${
            testResult.success
              ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
              <span className="font-semibold">{testResult.success ? 'Connection Test Passed' : 'Connection Test Failed'}</span>
            </div>
            {testResult.latencyMs > 0 && (
              <span className="rounded-lg bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Latency: {testResult.latencyMs}ms
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-normal pl-6">{testResult.message}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Step 1: Provider Selection */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              1. Select Platform AI Provider
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 font-normal">
              Choose which AI foundation model infrastructure handles platform queries.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVIDER_OPTIONS.map((opt) => {
              const isSelected = provider === opt.id
              return (
                <div
                  key={opt.id}
                  onClick={() => handleProviderSelect(opt.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${opt.tagColor}`}>
                      {opt.tag}
                    </span>
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{opt.name}</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-normal line-clamp-2 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 2: Model & Credentials Configuration */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-600" />
              2. Model Selection & Security Credentials
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 font-normal">
              Specify the model version and supply the API authorization key.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Model Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Model Variant
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomModel(!useCustomModel)}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  {useCustomModel ? 'Choose from list' : 'Custom model name'}
                </button>
              </div>

              {useCustomModel ? (
                <div>
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. gemini-2.0-flash or gpt-4.5-preview"
                    className="input-field w-full text-xs font-normal"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 font-normal">
                    Enter the exact API identifier for custom or fine-tuned model endpoints.
                  </p>
                </div>
              ) : (
                <div>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="input-field w-full text-xs font-medium cursor-pointer"
                  >
                    {currentProviderObj.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.hint}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400 font-normal">
                    Selected variant determines token consumption speed and inference reasoning depth.
                  </p>
                </div>
              )}
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Provider API Key
                </label>
                {apiKeyPreview && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Saved: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono text-[10px]">{apiKeyPreview}</code>
                  </span>
                )}
              </div>

              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={apiKeyPreview ? '•••••••••••••••••••••••• (Leave blank to keep current)' : 'Enter API secret key...'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-field w-full pl-9 pr-10 text-xs font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-normal">
                Keys are encrypted at rest using AES-256-GCM. Raw credentials are never exposed to clients.
              </p>
            </div>
          </div>

          {/* Action Buttons: Test Connection & Save */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              disabled={testing || (!apiKey.trim() && !apiKeyPreview && !process.env.GEMINI_API_KEY)}
              onClick={handleTestConnection}
              className="btn-secondary w-full sm:w-auto px-4 py-2 text-xs font-medium gap-2 justify-center"
            >
              {testing ? <RotateCw className="h-3.5 w-3.5 animate-spin text-blue-600" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
              {testing ? 'Testing Endpoint...' : 'Test AI Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full sm:w-auto px-6 py-2 text-xs font-semibold gap-2 justify-center"
            >
              {saving ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving Platform Settings...' : 'Save AI Configuration'}
            </button>
          </div>
        </div>

        {/* Step 3: Platform Capabilities Info */}
        <div className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-blue-600" />
            Active Platform Capabilities Powered by this Engine
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <FileText className="h-4 w-4 text-blue-500" />
                Resume Parsing
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                Extracts candidate skills, job history, and personal details automatically when applications are submitted.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Candidate Matching
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                Calculates dynamic 0-100% fit scores and concise reasoning comparing candidate profiles to open requirements.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Centralized Governance
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                Individual tenant organizations do not need their own AI keys; billing and provider control remain with Super Admin.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
