'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from 'date-fns'

export default function WeeklyScreen({ user, today, showToast }) {
  const supabase = createClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tasks, setTasks] = useState([])
  const [insight, setInsight] = useState(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [streak, setStreak] = useState(0)

  const weekStart = format(startOfWeek(subWeeks(new Date(today), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd   = format(endOfWeek(subWeeks(new Date(today), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekDays  = eachDayOfInterval({ start: new Date(weekStart), end: new Date(weekEnd) })

  useEffect(() => {
    loadWeekData()
  }, [weekOffset])

  async function loadWeekData() {
    const { data } = await supabase.from('tasks').select('*').gte('date', weekStart).lte('date', weekEnd)
    setTasks(data || [])

    const total = data?.length || 0
    const done  = data?.filter(t => t.done).length || 0
    const high  = data?.filter(t => t.priority === 'high') || []
    const carryOvers = data?.filter(t => t.carried_over).length || 0
    setMetrics({ total, done, highDone: high.filter(t=>t.done).length, highTotal: high.length, carryOvers, rate: total ? Math.round((done/total)*100) : 0 })

    // Load saved insight
    const { data: saved } = await supabase.from('ai_insights').select('*')
      .eq('week_start', weekStart).maybeSingle()
    if (saved) setInsight(saved.content)
  }

  async function generateInsights() {
    setInsightLoading(true)
    try {
      const res = await fetch('/api/tasks/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, weekEnd }),
      })
      const { insight: ins } = await res.json()
      setInsight(ins)
    } catch {
      showToast('Failed to generate insights')
    }
    setInsightLoading(false)
  }

  function getTasksForDay(date) {
    const d = format(date, 'yyyy-MM-dd')
    return tasks.filter(t => t.date === d)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-3xl">Weekly review</h2>
        <div className="flex gap-2 items-center">
          <button onClick={() => setWeekOffset(w => w+1)} className="btn-secondary text-sm px-3">←</button>
          <span className="text-sm" style={{ color: '#6B6860' }}>
            {format(new Date(weekStart), 'MMM d')}–{format(new Date(weekEnd), 'MMM d')}
          </span>
          <button onClick={() => setWeekOffset(w => Math.max(0,w-1))} disabled={weekOffset===0} className="btn-secondary text-sm px-3 disabled:opacity-30">→</button>
        </div>
      </div>

      {/* Stats */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Completed', value: `${metrics.done}/${metrics.total}`, sub: `${metrics.rate}% rate` },
            { label: 'High priority', value: `${metrics.highDone}/${metrics.highTotal}`, sub: 'done' },
            { label: 'Carry-overs', value: metrics.carryOvers, sub: 'from prev days' },
            { label: 'Streak', value: '🔥 5', sub: 'days in a row' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: '#A8A59E' }}>{s.label}</p>
              <p className="font-serif text-2xl leading-none mb-1">{s.value}</p>
              <p className="text-xs" style={{ color: '#6B6860' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        {weekDays.map(day => {
          const dayTasks = getTasksForDay(day)
          const dayDone  = dayTasks.filter(t => t.done).length
          const isToday  = format(day, 'yyyy-MM-dd') === today
          const score    = dayTasks.length ? Math.round((dayDone/dayTasks.length)*10) : null

          return (
            <div key={day.toISOString()} className={`card p-3 text-center ${isToday ? 'ring-2 ring-[#2D5BE3]' : ''}`}>
              <p className={`text-xs mb-2 uppercase tracking-wide ${isToday ? 'text-[#2D5BE3] font-semibold' : ''}`}
                style={{ color: isToday ? undefined : '#A8A59E' }}>
                {format(day, 'EEE')}
              </p>
              <p className="font-serif text-xl leading-none mb-2">
                {score !== null ? score : '–'}
              </p>
              <div className="flex gap-0.5 justify-center flex-wrap">
                {dayTasks.slice(0,5).map(t => (
                  <div key={t.id} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: t.priority==='high' ? '#C84B2F' : t.priority==='medium' ? '#B07A1A' : '#2E7D52', opacity: t.done ? 1 : 0.3 }} />
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#A8A59E' }}>{dayDone}/{dayTasks.length}</p>
            </div>
          )
        })}
      </div>

      {/* AI Insights */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">AI insights</h3>
          <button
            onClick={generateInsights}
            disabled={insightLoading}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {insightLoading ? 'Analysing…' : insight ? 'Refresh ↺' : 'Generate insights →'}
          </button>
        </div>

        {insightLoading && (
          <div className="flex gap-2 py-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full dot-pulse" style={{ background: '#2D5BE3', animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
        )}

        {insight && !insightLoading && (
          <div className="text-sm leading-relaxed space-y-3" style={{ color: '#3d3d3a' }}>
            {insight.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {!insight && !insightLoading && (
          <p className="text-sm py-2" style={{ color: '#A8A59E' }}>
            Claude will analyse your patterns, completion rates, and carry-over habits to give you honest, actionable feedback.
          </p>
        )}
      </div>

      {/* Integrations */}
      <div className="card p-5">
        <h3 className="font-medium text-sm mb-3">Integrations</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { icon: '📅', label: 'Google Calendar', desc: 'Auto-protect deep work blocks' },
            { icon: '📝', label: 'Notion',           desc: 'Push tasks & completions' },
            { icon: '💬', label: 'Slack',             desc: 'Block-start reminders' },
          ].map(int => (
            <button key={int.label} className="btn-secondary text-sm flex items-center gap-2 py-2" title={int.desc}>
              <span>{int.icon}</span> {int.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: '#A8A59E' }}>
          Integrations coming soon — add your email to the waitlist to be notified.
        </p>
      </div>
    </div>
  )
}
