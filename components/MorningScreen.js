'use client'
import { useState } from 'react'

const PRIORITY_COLORS = {
  high:   { dot: '#C84B2F', bg: '#FDF0EC', border: '#F5C4B3', text: '#C84B2F' },
  medium: { dot: '#B07A1A', bg: '#FDF6E6', border: '#FAC775', text: '#B07A1A' },
  low:    { dot: '#2E7D52', bg: '#EBF5F0', border: '#9FE1CB', text: '#2E7D52' },
}

export default function MorningScreen({
  today, profile, carryOverTasks, existingTasks,
  onTasksConfirmed, onCarryOver, onScheduleBuilt, onGoToToday, showToast
}) {
  const [mode, setMode] = useState('type')
  const [rawText, setRawText] = useState('')
  const [aiTasks, setAiTasks] = useState([])
  const [step, setStep] = useState('input')
  const [selectedCarry, setSelectedCarry] = useState(carryOverTasks.map(t => t.id))
  const [voiceActive, setVoiceActive] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [workDayStart, setWorkDayStart] = useState(profile?.work_start_hour ? `${profile.work_start_hour}:00` : '09:00')

  const hasExisting = existingTasks.length > 0

  function startVoice() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Voice not supported in this browser')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setRawText(transcript)
    }
    r.onend = () => setVoiceActive(false)
    r.start()
    setRecognition(r)
    setVoiceActive(true)
  }

  function stopVoice() {
    recognition?.stop()
    setVoiceActive(false)
  }

  const AI_PRIORITIES = {
    'finish': 'high', 'deck': 'high', 'report': 'high', 'review': 'high',
    'strategy': 'high', 'presentation': 'high', 'board': 'high', 'client': 'high',
    'send': 'medium', 'email': 'medium', 'update': 'medium', 'reply': 'medium',
    'book': 'medium', 'budget': 'medium', 'sync': 'medium', 'call': 'medium',
    'check': 'low', 'order': 'low', 'tracker': 'low', 'notion': 'low', 'logs': 'low',
  }

  function guessPriority(text) {
    const lower = text.toLowerCase()
    for (const [kw, pri] of Object.entries(AI_PRIORITIES)) {
      if (lower.includes(kw)) return pri
    }
    return 'medium'
  }

  async function handleAnalyse() {
    if (!rawText.trim() && aiTasks.length === 0) {
      showToast('Add some tasks first!')
      return
    }
    setStep('thinking')
    try {
      const res = await fetch('/api/tasks/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, existingTasks }),
      })
      const { tasks, error } = await res.json()
      if (error) throw new Error(error)
      setAiTasks(tasks.map((t, i) => ({ ...t, _id: i })))
      setStep('review')
    } catch {
      const lines = rawText.split(/[,\n]+/).map(l => l.trim()).filter(Boolean)
      setAiTasks(lines.map((l, i) => ({ _id: i, name: l, priority: guessPriority(l) })))
      setStep('review')
    }
  }

  function updateTaskPriority(idx, priority) {
    setAiTasks(prev => prev.map((t, i) => i === idx ? { ...t, priority } : t))
  }

  function removeTask(idx) {
    setAiTasks(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleBuildDay() {
    setStep('building')
    await onTasksConfirmed(aiTasks)
    const toCarry = carryOverTasks.filter(t => selectedCarry.includes(t.id))
    if (toCarry.length > 0) await onCarryOver(toCarry)
    try {
      const allTasks = [...aiTasks, ...toCarry]
      const res = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: allTasks, profile, workDayStart }),
      })
      const { schedule } = await res.json()
      await onScheduleBuilt(schedule)
    } catch {
      showToast('Schedule building failed')
      onGoToToday()
    }
  }

  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <p className="text-sm mb-2" style={{ color: '#A8A59E' }}>{dateLabel}</p>
        <h1 className="font-serif text-4xl leading-tight mb-2">
          {step === 'input' ? <>Good morning.<br /><em style={{ color: '#2D5BE3' }}>What's on your plate?</em></> :
           step === 'thinking' ? 'FocusFlow is reading your tasks…' :
           step === 'review' ? 'Review & adjust priorities' :
           'Building your day…'}
        </h1>
        {step === 'input' && <p className="text-sm" style={{ color: '#6B6860' }}>FocusFlow will sort and schedule your day.</p>}
      </div>

      {/* Work day start time */}
      {step === 'input' && (
        <div className="card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">When does your day start?</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B6860' }}>Sets your first time block</p>
          </div>
          <input
            type="time"
            value={workDayStart}
            onChange={e => setWorkDayStart(e.target.value)}
            className="input w-32 text-sm"
          />
        </div>
      )}

      {hasExisting && step === 'input' && (
        <div className="card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">You already have {existingTasks.length} tasks today</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B6860' }}>Add more, or go straight to your plan</p>
          </div>
          <button onClick={onGoToToday} className="btn-primary text-sm">See today →</button>
        </div>
      )}

      {carryOverTasks.length > 0 && step === 'input' && (
        <div className="rounded-xl p-4 mb-4 border" style={{ background: '#FDF6E6', borderColor: '#FAC775' }}>
          <p className="font-medium text-sm mb-2" style={{ color: '#B07A1A' }}>
            ↩ {carryOverTasks.length} unfinished from yesterday
          </p>
          <div className="space-y-1.5">
            {carryOverTasks.map(t => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCarry.includes(t.id)}
                  onChange={e => setSelectedCarry(prev =>
                    e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                  )}
                  className="rounded"
                />
                <span className="text-sm">{t.name}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded badge-${t.priority === 'medium' ? 'med' : t.priority}`}>
                  {t.priority === 'medium' ? 'med' : t.priority}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className="card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <span className="text-sm font-medium">Brain dump your tasks</span>
            <div className="flex gap-1">
              {['type','voice'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                    mode === m ? 'bg-[#2D5BE3] text-white' : 'text-[#6B6860] hover:bg-[#F0EDE6]'
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          {mode === 'type' && (
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Type everything on your mind... e.g. 'Finish the deck for the 3pm call, reply to Ahmed, review budget, book flights'"
              className="w-full p-4 text-sm outline-none resize-none bg-white"
              style={{ minHeight: 140, lineHeight: 1.7 }}
            />
          )}

          {mode === 'voice' && (
            <div className="py-8 text-center px-4">
              <button
                onClick={voiceActive ? stopVoice : startVoice}
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all ${
                  voiceActive ? 'bg-[#C84B2F] animate-pulse' : 'bg-[#2D5BE3] hover:scale-105'
                }`}
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.64 6.43 6 6.92V21h2v-2.08c3.36-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <p className="text-sm" style={{ color: '#6B6860' }}>
                {voiceActive ? 'Listening… tap to stop' : 'Tap to speak your tasks'}
              </p>
              {rawText && <p className="text-sm mt-3 text-left p-3 rounded-lg" style={{ background: '#F0EDE6' }}>{rawText}</p>}
            </div>
          )}

          <div class="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <span className="text-xs" style={{ color: '#A8A59E' }}>One task per line, or free-write</span>
            <button onClick={handleAnalyse} disabled={!rawText.trim()} className="btn-primary text-sm">
              Analyse & Schedule →
            </button>
          </div>
        </div>
      )}

      {step === 'thinking' && (
        <div className="card p-10 text-center">
          <div className="flex gap-2 justify-center mb-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full dot-pulse" style={{ background: '#2D5BE3', animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <p className="text-sm" style={{ color: '#6B6860' }}>FocusFlow is reading your tasks…</p>
        </div>
      )}

      {step === 'building' && (
        <div className="card p-10 text-center">
          <div className="flex gap-2 justify-center mb-4">
            {[0,1,2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full dot-pulse" style={{ background: '#2E7D52', animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <p className="text-sm" style={{ color: '#6B6860' }}>Building your time-blocked day…</p>
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="card overflow-hidden mb-4">
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <p className="text-sm font-medium">FocusFlow classified your tasks — adjust if needed</p>
            </div>
            <div className="divide-y">
              {aiTasks.map((task, idx) => {
                const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                return (
                  <div key={task._id} className="flex items-center gap-3 px-4 py-3 animate-slide-up">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                    <span className="flex-1 text-sm">{task.name}</span>
                    <select
                      value={task.priority}
                      onChange={e => updateTaskPriority(idx, e.target.value)}
                      className="text-xs border rounded-md px-2 py-1 outline-none"
                      style={{ borderColor: c.border, background: c.bg, color: c.text }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button onClick={() => removeTask(idx)} className="w-6 h-6 rounded-full flex items-center justify-center text-sm hover:bg-red-50 hover:text-red-500" style={{ color: '#A8A59E' }}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setStep('input')} className="btn-secondary text-sm">← Edit tasks</button>
            <button onClick={handleBuildDay} className="btn-primary text-sm">Build my day →</button>
          </div>
        </>
      )}
    </div>
  )
}
