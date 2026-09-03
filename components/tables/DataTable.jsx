'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

function collectSearchText(value) {
  if (value == null) return ''
  if (['string', 'number', 'boolean'].includes(typeof value)) return String(value)
  if (Array.isArray(value)) return value.map(collectSearchText).join(' ')
  if (typeof value === 'object') return Object.values(value).map(collectSearchText).join(' ')
  return ''
}

export function DataTable({
  columns,
  data = [],
  isLoading = false,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search...',
  actions,
  emptyMessage = 'No records found',
  className,
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filtered = data.filter((row) => {
    if (!search) return true
    return collectSearchText(row).toLowerCase().includes(search.toLowerCase())
  })

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    const cmp = String(aVal || '').localeCompare(String(bVal || ''))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className={cn('bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden mb-4 flex flex-col', className)}>
      {(searchable || actions) && (
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between border-b border-slate-100 dark:border-slate-800/60">
          {searchable && (
            <div className="relative flex-1 max-w-sm group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full bg-slate-50/50 dark:bg-slate-900 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:font-semibold placeholder:text-slate-400"
              />
            </div>
          )}
          {actions && <div className="flex gap-3 items-center">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key || col.accessor}
                  onClick={() => col.sortable !== false && col.accessor && handleSort(col.accessor)}
                  className={cn(
                    'px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider',
                    col.sortable !== false && col.accessor ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors' : ''
                  )}
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.accessor && sortKey === col.accessor && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                        : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={row.id || row._id || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'group transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  )}
                >
                  {columns.map((col) => (
                    <td 
                      key={col.key || col.accessor} 
                      className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors"
                    >
                      {col.render
                        ? col.render(col.accessor ? row[col.accessor] : row, row)
                        : col.accessor ? row[col.accessor] : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg transition-colors font-medium',
                    page === p
                      ? 'gradient-primary-mesh text-white shadow-md shadow-blue-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
