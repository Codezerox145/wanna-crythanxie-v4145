const STYLES = {
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300',
  offline: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
  pairing: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-300',
  reconnecting: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
}

const DOT = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  pairing: 'bg-amber-500',
  error: 'bg-rose-500',
  reconnecting: 'bg-blue-500',
}

export default function StatusBadge({ status }) {
  const key = STYLES[status] ? status : 'offline'
  const label = key === 'error' ? 'Needs attention' : key.charAt(0).toUpperCase() + key.slice(1)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${STYLES[key]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[key]}`} />
      {label}
    </span>
  )
}
