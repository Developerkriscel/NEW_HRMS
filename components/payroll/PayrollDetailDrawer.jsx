import { X, Calendar, DollarSign, Calculator, Receipt, ShieldCheck, Download, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/common/Badge'
import { Portal } from '@/components/common/Portal'

export function PayrollDetailDrawer({ isOpen, onClose, payslip, onStatusChange, onDownload }) {
  if (!isOpen || !payslip) return null

  return (
    <Portal>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Payslip Details</h2>
            <p className="text-sm text-slate-500">
              {new Date(payslip.year, payslip.month - 1, 1).toLocaleString('default', { month: 'long' })} {payslip.year}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Employee Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {payslip.employee?.firstName?.[0]}{payslip.employee?.lastName?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {payslip.employee?.firstName} {payslip.employee?.lastName}
              </h3>
              <p className="text-sm text-slate-500">{payslip.employee?.employeeCode} • {payslip.employee?.department?.name || 'No Dept'}</p>
            </div>
            <div className="ml-auto">
              <Badge>{payslip.status}</Badge>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5" /> Attendance
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-black text-slate-900 dark:text-white">{payslip.workingDays}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Working Days</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-600">{payslip.paidDays || Math.max(0, payslip.workingDays - payslip.absentDays)}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Paid Days</div>
              </div>
              <div>
                <div className="text-lg font-black text-red-500">{payslip.absentDays}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">LOP Days</div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <DollarSign className="w-3.5 h-3.5" /> Earnings
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Basic Salary</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(payslip.basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>HRA</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(payslip.hraAllowance)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Conveyance</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(payslip.conveyanceAllowance)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Medical</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(payslip.medicalAllowance)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Special</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(payslip.specialAllowance)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Bonus/Incentive</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency((payslip.bonus || 0) + (payslip.incentive || 0))}</span>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white">Gross Earnings</span>
                <span className="font-black text-emerald-600 text-base">{formatCurrency(payslip.grossSalary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Calculator className="w-3.5 h-3.5" /> Deductions
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Provident Fund (PF)</span>
                <span className="font-medium text-slate-900 dark:text-white">- {formatCurrency(payslip.pfDeduction)}</span>
              </div>
              {payslip.esiDeduction > 0 && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>ESI</span>
                  <span className="font-medium text-slate-900 dark:text-white">- {formatCurrency(payslip.esiDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Professional Tax</span>
                <span className="font-medium text-slate-900 dark:text-white">- {formatCurrency(payslip.professionalTax)}</span>
              </div>
              {payslip.tdsDeduction > 0 && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>TDS</span>
                  <span className="font-medium text-slate-900 dark:text-white">- {formatCurrency(payslip.tdsDeduction)}</span>
                </div>
              )}
              {payslip.leaveDeduction > 0 && (
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <span>Loss of Pay (LOP)</span>
                  <span className="font-medium">- {formatCurrency(payslip.leaveDeduction)}</span>
                </div>
              )}
              
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white">Total Deductions</span>
                <span className="font-black text-red-500 text-base">- {formatCurrency(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="bg-indigo-600 rounded-2xl p-5 text-white flex justify-between items-center shadow-lg shadow-indigo-200 dark:shadow-none">
            <div>
              <div className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-1">Net Pay</div>
              <div className="text-3xl font-black">{formatCurrency(payslip.netSalary)}</div>
            </div>
            <Receipt className="w-12 h-12 text-indigo-400/50" />
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-2">
          {['FINALIZED', 'PAID'].includes(payslip.status) && (
            <button onClick={() => onDownload?.(payslip._id)} className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold transition-all text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> PDF
            </button>
          )}
          {payslip.status === 'DRAFT' && (
            <button onClick={() => onStatusChange(payslip._id, 'REVIEW')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2">
              Send to Review
            </button>
          )}
          {payslip.status === 'REVIEW' && (
            <button onClick={() => onStatusChange(payslip._id, 'APPROVED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Approve
            </button>
          )}
          {payslip.status === 'APPROVED' && (
            <button onClick={() => onStatusChange(payslip._id, 'FINALIZED')} className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2">
              Finalize
            </button>
          )}
          {payslip.status === 'FINALIZED' && (
            <button onClick={() => onStatusChange(payslip._id, 'PAID')} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-all text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Mark Paid
            </button>
          )}
        </div>
      </div>
    </Portal>
  )
}
