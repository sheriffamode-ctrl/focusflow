'use client'
import { useState } from 'react'

const BLOCK_STYLES = {
  deep_work:      { bg: '#FDF0EC', border: '#F5C4B3', label: '#C84B2F', dot: '#C84B2F', badge: 'High' },
  medium_cluster: { bg: '#FDF6E6', border: '#FAC775', label: '#B07A1A', dot: '#B07A1A', badge: 'Medium' },
  quick_wins:     { bg: '#EBF5F0', border: '#9FE1CB', label: '#2E7D52', dot: '#2E7D52', badge: 'Low' },
  buffer:         { bg: '#F7F5F0', border: 'rgba(0,0,0,0.08)', label: '#A8A59E', dot: '#A8A59E', badge: '' },
}

const DEFAULT_SCHEDULE = [
  { time: '08:00', end: '09:00', type: 'buffer',         label: 'Early start',    tasks: [], tip: 'Email triage, coffee, ease in.' },
  { time: '09:00', end: '12:00', type: 'deep_work',      label: 'Deep work block', tasks: [], tip: 'Protected. No meetings, no Slack.' },
  { time: '12:00', end: '13:00', type: 'buffer',         label: 'Lunch',          tasks: [], tip: 'Rest and recharge.' },
  { time: '13:00', end: '15:30', type: 'medium_cluster', label: 'Medium tasks',   tasks: [], tip: 'Batch your calls and collaborative work here.' },
  { time: '15:30', end: '17:00', type: 'quick_wins',     label: 'Quick wins',     tasks: [], tip: 'Clear the inbox, tick the small stuff.' },
  { time: '17:00', end: '18:00', type: 'buffer',         label: 'Wrap up',        tasks: [], tip: 'Review tomorrow, carry over anything unfinished.' },
]

function matchTasksToBlock(tasks, blockType) {
  if (blockType === 'deep_work')      return tasks.filter(t => t.priority === 'high')
  if (blockType === 'medium_cluster') return tasks.filter(t => t.priority === 'medium')
  if (blockType === 'quick_wins')     return tasks.filter(t => t.priority === 'low')
  return []
}

export default function TodayScreen({ tasks, schedule, today, profile, onToggleTask, onUpdatePriority, onDeleteTask, onStartFocus, onAddTask, showToast }) {
  const [expandedBlock, setExpandedBlock] = useState(null)
  const blocks = schedule || DEFAULT_SCHEDULE

  const high   = tasks.filter(t => t.priority === 'high')
  const medium = tasks.filter(t => t.priority === 'medium')
  const low    = tasks.filter(t => t.priority === 'low')
  const highDone   = high.filter(t => t.done).length
  const medDone    = medium.filter(t => t.done).length
  const lowDone    = low.filter(t => t.done).length
  const totalDone  = tasks.filter(t => t.done).length

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl leading-none">Today's plan</h2>
          <p className="text-sm mt-1" style={{ color: '#A8A59E' }}>{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onAddTask} className="btn-secondary text-sm">+ Add task</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Timeline */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <span className="text-sm font-medium">Time blocks</span>
            <div className="flex gap-4 text-xs" style={{ color: '#6B6860' }}>
              <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#C84B2F' }} />Deep</span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#B07A1A' }} />Medium</span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#2E7D52' }} />Quick</span>
            </div>
          </div>

          <div className="p-5 space-y-2">
            {blocks.map((block, idx) => {
              const s = BLOCK_STYLES[block.type] || BLOCK_STYLES.buffer
              const blockTasks = block.tasks?.length > 0
                ? tasks.filter(t => block.tasks.includes(t.name))
                : matchTasksToBlock(tasks, block.type)
              const isActive = block.type !== 'buffer'
              const isExpanded = expandedBlock === idx

              return (
                <div key={idx}
                  className="grid"
                  style={{ gridTemplateColumns: '52px 1fr', gap: 0 }}
                >
                  <div className="text-xs pt-3.5 pr-3 text-right font-mono" style={{ color: '#A8A59E' }}>
                    {block.time}
                  </div>
                  <div className="border-l pl-4 pb-2" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                    <div
                      className={`rounded-xl p-3.5 transition-all ${isActive ? 'cursor-pointer' : ''}`}
                      style={{ background: s.bg, border: `1px solid ${s.border}` }}
                      onClick={() => isActive && setExpandedBlock(isExpanded ? null : idx)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold tracking-wide uppercase mb-0.5" style={{ color: s.label }}>
                            {block.label}
                          </div>
                          <div className="text-xs" style={{ color: '#6B6860' }}>
                            {block.time}–{block.end}
                            {block.tip && <span className="ml-2 hidden sm:inline" style={{ color: '#A8A59E' }}>· {block.tip}</span>}
                          </div>
                        </div>
                        {isActive && (
                          <button
                            onClick={e => { e.stopPropagation(); onStartFocus({ name: block.label, id: null }) }}
                            className="text-xs px-2.5 py-1 rounded-md font-medium flex-shrink-0 transition-all hover:opacity-80"
                            style={{ background: '#1A1A18', color: 'white' }}
                          >
                            Focus
                          </button>
                        )}
                      </div>

                      {/* Tasks in block */}
                      {blockTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {blockTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={e => { e.stopPropagation(); onToggleTask(task.id) }}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${task.done ? 'opacity-40 line-through' : 'hover:opacity-80'}`}
                              style={{ background: 'white', borderColor: s.border, color: s.label }}
                            >
                              {task.done ? '✓ ' : ''}{task.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Progress */}
          <div className="card p-4">
            <h3 className="text-sm font-medium mb-3">Today's progress</h3>
            {[
              { label: 'High',   done: highDone,  total: high.length,   color: '#C84B2F' },
              { label: 'Medium', done: medDone,   total: medium.length, color: '#B07A1A' },
              { label: 'Low',    done: lowDone,   total: low.length,    color: '#2E7D52' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2 mb-2.5">
                <span className="text-xs w-12 flex-shrink-0" style={{ color: '#6B6860' }}>{row.label}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: '#F0EDE6' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${row.total ? (row.done/row.total)*100 : 0}%`, background: row.color }} />
                </div>
                <span className="text-xs w-8 text-right" style={{ color: '#A8A59E' }}>{row.done}/{row.total}</span>
              </div>
            ))}
            {tasks.length > 0 && (
              <div className="mt-3 pt-3 border-t text-center" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                <span className="font-serif text-2xl">{Math.round((totalDone/tasks.length)*100)}%</span>
                <span className="text-xs ml-1" style={{ color: '#6B6860' }}>complete</span>
              </div>
            )}
          </div>

          {/* All tasks */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">All tasks</h3>
              <span className="text-xs" style={{ color: '#A8A59E' }}>{tasks.length} total</span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#A8A59E' }}>No tasks yet — add some above</p>
            ) : (
              <div className="space-y-0.5">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2.5 py-2 group">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                        task.done ? 'border-[#2D5BE3] bg-[#2D5BE3]' : 'border-gray-300 hover:border-[#2D5BE3]'
                      }`}
                    >
                      {task.done && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                    </button>
                    <span className={`flex-1 text-xs leading-tight ${task.done ? 'line-through opacity-40' : ''}`}>{task.name}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 badge-${task.priority === 'medium' ? 'med' : task.priority}`}>
                      {task.priority === 'medium' ? 'med' : task.priority}
                    </span>
                    <button
                      onClick={() => onStartFocus(task)}
                      className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded transition-all"
                      style={{ background: '#1A1A18', color: 'white' }}
                    >
                      ▶
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
