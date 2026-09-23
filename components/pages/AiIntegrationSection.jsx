'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Key, CheckCircle2, AlertCircle, Save } from 'lucide-react'
import api from '@/services/api'

export function AiIntegrationSection() {
  const [provider, setProvider] = useState('GEMINI')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyPreview, setApiKeyPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await api.get('/hr/settings/ai')
      if (res.data?.data) {
        const prov = res.data.data.provider || 'GEMINI'
        setProvider(prov)
        setModel(res.data.data.model || (prov === 'GROK' ? 'grok-2-latest' : prov === 'MISTRAL' ? 'mistral-large-latest' : 'gemini-2.5-flash'))
        setApiKeyPreview(res.data.data.apiKeyPreview)
      }
    } catch (err) {
      console.error('Failed to fetch AI settings', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await api.put('/hr/settings/ai', { provider, model, apiKey })
      
      setMessage('AI integration settings saved successfully.')
      setApiKey('') // Clear the input field for security
      if (res.data?.data?.apiKeyPreview) {
        setApiKeyPreview(res.data.data.apiKeyPreview)
      }
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading AI settings...</div>
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Configure your AI provider for advanced resume parsing and candidate matching.
        </p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> {message}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 relative z-10">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">AI Provider</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="provider" 
                value="GEMINI" 
                checked={provider === 'GEMINI'} 
                onChange={() => {
                  setProvider('GEMINI')
                  setModel('gemini-2.5-flash')
                }}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Google Gemini</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="provider" 
                value="GROK" 
                checked={provider === 'GROK'} 
                onChange={() => {
                  setProvider('GROK')
                  setModel('grok-2-latest')
                }}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Grok AI (xAI)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="provider" 
                value="MISTRAL" 
                checked={provider === 'MISTRAL'} 
                onChange={() => {
                  setProvider('MISTRAL')
                  setModel('mistral-large-latest')
                }}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mistral AI</span>
            </label>
          </div>
        </div>

        <div className="max-w-md">
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">AI Model</label>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="input-field w-full"
          >
            {provider === 'GEMINI' ? (
              <>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Cost Effective)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Reasoning)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </>
            ) : provider === 'MISTRAL' ? (
              <>
                <option value="mistral-large-latest">Mistral Large Latest (Top Tier)</option>
                <option value="mistral-small-latest">Mistral Small Latest (Fast & Cost Effective)</option>
                <option value="pixtral-12b-2409">Pixtral 12B (Vision)</option>
              </>
            ) : (
              <>
                <option value="grok-2-latest">Grok 2 Latest (Balanced & Capable)</option>
                <option value="grok-2-vision-latest">Grok 2 Vision Latest</option>
                <option value="grok-beta">Grok Beta</option>
              </>
            )}
          </select>
        </div>

        <div className="max-w-md">
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">API Key</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              placeholder={apiKeyPreview ? `Current: ${apiKeyPreview}` : 'Enter your API key...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field pl-10 border border-transparent focus:border-purple-500/30 w-full"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Leave blank to keep the current key. Keys are securely encrypted at rest.
          </p>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
