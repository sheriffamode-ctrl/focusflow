'use client'
import { format } from 'date-fns'

export default function Nav({ screen, setScreen, user, onSignOut, tasks }) {
  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const streak = 5 // TODO: calculate from DB

  const tabs = [
    { id: 'morning', label: 'Morning' },
    { id: 'today',   label: 'Today' },
    { id: 'weekly',  label: 'Weekly' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b flex items-center justify-between px-6 h-14" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
      <span className="font-serif text-xl">Focus<span style={{ color: '#2D5BE3' }}>Flow</span></span>

      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setScreen(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              screen === t.id
                ? 'bg-[#EEF2FD] text-[#2D5BE3] font-medium'
                : 'text-[#6B6860] hover:bg-[#F0EDE6]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {total > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: '#FDF6E6', color: '#B07A1A' }}>
            🔥 {streak}d · {done}/{total}
          </span>
        )}
        <button
          onClick={onSignOut}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ background: '#2D5BE3' }}
          title="Sign out"
        >
          {(user?.email?.[0] || 'U').toUpperCase()}
        </button>
      </div>
    </nav>
  )
}
