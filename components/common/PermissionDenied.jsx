import { ShieldAlert } from 'lucide-react'

// Rendered in place of page content when a data fetch comes back 403 —
// the real enforcement already happened server-side (requirePlatformPermission);
// this is just the honest UI reflection of that, not a client-side gate.
export function PermissionDenied({ message = "You don't have permission to view this page.", requiredPermission }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center py-20 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">Access Denied</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
      {requiredPermission && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono">{requiredPermission}</p>
      )}
    </div>
  )
}
