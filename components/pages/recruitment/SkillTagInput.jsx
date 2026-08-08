'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tag-style input for skill lists ("React ×  Node.js ×  MongoDB ×") instead
// of a plain comma-separated textarea — this is what will eventually feed
// AI candidate matching, so it needs to already be an array of clean tokens.
export function SkillTagInput({ value = [], onChange, placeholder = 'Type a skill and press Enter', className, error }) {
  const [draft, setDraft] = useState('')

  function commitDraft() {
    const skill = draft.trim()
    if (!skill) return
    if (!value.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      onChange([...value, skill])
    }
    setDraft('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  function removeAt(index) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div
        className={cn(
          'input-field flex flex-wrap items-center gap-1.5 min-h-[42px] py-1.5 cursor-text',
          error && 'border-red-400 focus-within:ring-red-500/30 focus-within:border-red-500'
        )}
        onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
      >
        {value.map((skill, i) => (
          <span key={skill} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
            {skill}
            <button type="button" onClick={() => removeAt(i)} className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-800/50">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitDraft}
          placeholder={value.length ? '' : placeholder}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-slate-400"
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
