'use client'

import { X } from 'lucide-react'

// Client-safe mirror of lib/offerHelpers.js#renderOfferTemplate — kept
// separate because the server helper pulls in Mongoose models that have no
// place in a client bundle. Same "## Heading" / blank-line-paragraph
// convention as lib/offerPdfGenerator.js so the preview matches the PDF.
function renderTemplate(content, variables) {
  if (!content) return ''
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = variables?.[key]
    return value != null && value !== '' ? String(value) : match
  })
}

// item 6 — "Show the final letter exactly as the candidate will see it."
export function OfferPreviewModal({ content, variables, onClose }) {
  const rendered = renderTemplate(content, variables || {})
  const lines = rendered.split('\n')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Offer Preview</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-8 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          {lines.map((line, i) => {
            if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-slate-900 dark:text-white mt-4 mb-1">{line.slice(3)}</h3>
            if (line.trim() === '') return <div key={i} className="h-2" />
            return <p key={i}>{line}</p>
          })}
        </div>
      </div>
    </div>
  )
}
