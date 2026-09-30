import { useState } from 'react'
import { Download, Search, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export function TransactionsReport({ data, loading, total, page, limit, setPage }) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transaction History</h3>
          <p className="text-sm text-slate-500 mt-1">Detailed list of payments and refunds</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Invoice</th>
              <th className="px-6 py-4">Method</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div></td>
                  <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : data && data.length > 0 ? (
              data.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {new Date(tx.paidAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{tx.companyName}</td>
                  <td className="px-6 py-4 text-slate-500">{tx.planName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                      <FileText className="w-3 h-3" /> {tx.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {tx.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                    <p>No transactions found for the selected filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Showing <span className="font-bold text-slate-900 dark:text-white">{page * limit + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min((page + 1) * limit, total)}</span> of <span className="font-bold text-slate-900 dark:text-white">{total}</span>
          </p>
          <div className="flex gap-2">
            <button 
              disabled={page === 0} 
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 font-semibold"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 font-semibold"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
