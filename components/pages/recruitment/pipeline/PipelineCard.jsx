'use client'

import Link from 'next/link'
import { Sparkles, Clock, AlertTriangle, Eye, ArrowRightLeft, MessageSquarePlus, XCircle } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { APPLICATION_SOURCE_LABELS } from '@/lib/candidateConstants'

export function PipelineCard({ card, selected, onToggleSelect, onDragStart, onDragEnd, onMoveStage, onAddNote, onReject }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border p-3 space-y-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow',
        selected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-100 dark:border-slate-800'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-start gap-2 min-w-0">
          <input type="checkbox" className="mt-0.5 accent-blue-600 flex-shrink-0" checked={selected} onChange={() => onToggleSelect(card.applicationId)} />
          <span className="min-w-0">
            <Link href={`/hr/recruitment/candidates/${card.candidateId}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">
              {card.candidateName}
            </Link>
            <span className="text-[10px] text-slate-400">{card.candidateCode}</span>
          </span>
        </label>
        {card.aiMatchScore != null && (
          <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold flex-shrink-0', card.aiMatchScore >= 85 ? 'text-emerald-600 dark:text-emerald-400' : card.aiMatchScore >= 70 ? 'text-blue-600 dark:text-blue-400' : card.aiMatchScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>
            <Sparkles className="w-3 h-3" /> {card.aiMatchScore}%
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {card.experience != null && <span>{card.experience}y</span>}
        {card.source && <span>{APPLICATION_SOURCE_LABELS[card.source] || card.source}</span>}
        {card.noticePeriod && <span>{card.noticePeriod} notice</span>}
      </div>

      {card.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{t}</span>)}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatRelativeTime(card.appliedAt)}</span>
        <span className={cn('flex items-center gap-1', card.isOverdue && 'text-red-500 font-medium')}>
          {card.isOverdue && <AlertTriangle className="w-3 h-3" />}
          {card.ageDays}d in stage{card.isOverdue ? ` · ${card.overdueDays}d overdue` : ''}
        </span>
      </div>

      {card.status === 'ON_HOLD' && (
        <div className="text-[10px] px-1.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">On Hold{card.holdUntil ? ` until ${new Date(card.holdUntil).toLocaleDateString()}` : ''}</div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-slate-50 dark:border-slate-800/60">
        <Link href={`/hr/recruitment/applications/${card.applicationId}`} title="View" className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Eye className="w-3.5 h-3.5" /></Link>
        <button title="Move Stage" onClick={() => onMoveStage(card)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><ArrowRightLeft className="w-3.5 h-3.5" /></button>
        <button title="Add Note" onClick={() => onAddNote(card)} className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><MessageSquarePlus className="w-3.5 h-3.5" /></button>
        <button title="Reject" onClick={() => onReject(card)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto"><XCircle className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}
