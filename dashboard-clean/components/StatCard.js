export default function StatCard({ label, value, icon, tint = 'brand' }) {
  const tintClasses = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800',
    purple: 'bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:ring-purple-800',
    pink: 'bg-pink-50 text-pink-700 ring-pink-100 dark:bg-pink-900/40 dark:text-pink-300 dark:ring-pink-800',
  }[tint] || 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 opacity-70" />
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-2xl text-lg ring-1 ring-inset ${tintClasses}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
    </div>
  )
}
