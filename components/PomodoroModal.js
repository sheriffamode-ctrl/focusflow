'use client'
import { useState, useEffect, useRef } from 'react'

const PHASES = [
  { label: 'Deep work', minutes: 25 },
  { label: 'Short break', minutes: 5 },
  { label: 'Deep work', minutes: 25 },
  { label: 'Short break', minutes: 5 },
  { label: 'Deep work', minutes: 25 },
  { label: 'Long break', minutes: 15 },
]

export default function PomodoroModal({ task, onClose, onComplete, showToast }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [seconds, setSeconds] = useState(PHASES[0].minutes * 60)
  const [running, setRunning] = useState(false)
  const [sessionsCompleted, setSessions] = useState(0)
  const intervalRef = useRef(null)
  const startSecondsRef = useRef(PHASES[0].minutes * 60)

  const phase = PHASES[phaseIdx]
  const totalSeconds = phase.minutes * 60
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 70
  const strokeOffset = circumference * (1 - (totalSeconds - seconds) / totalSeconds)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handlePhaseComplete()
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, phaseIdx])

  function handlePhaseComplete() {
    const isWork = phase.label !== 'Short break' && phase.label !== 'Long break'
    if (isWork) {
      setSessions(s => s + 1)
      onComplete(phase.minutes)
      showToast('Session complete! 🎯 Take a break.')
    } else {
      showToast('Break done — back to it!')
    }
    const next = (phaseIdx + 1) % PHASES.length
    setPhaseIdx(next)
    setSeconds(PHASES[next].minutes * 60)
  }

  function toggle() { setRunning(r => !r) }

  function reset() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setSeconds(phase.minutes * 60)
  }

  function fmt(s) {
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  }

  const isBreak = phase.label.includes('break')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in">
        <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: '#A8A59E' }}>
          {isBreak ? 'Break time' : 'Focus session'}
        </div>
        <h3 className="font-medium text-base mb-1 leading-tight">{task.name}</h3>
        <p className="text-xs mb-6" style={{ color: '#A8A59E' }}>{phase.label} · {phase.minutes} min</p>

        {/* Session dots */}
        <div className="flex gap-2 justify-center mb-6">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{ background: i < sessionsCompleted ? '#2D5BE3' : '#F0EDE6' }} />
          ))}
        </div>

        {/* Ring */}
        <div className="relative w-44 h-44 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#F0EDE6" strokeWidth="8"/>
            <circle
              cx="80" cy="80" r="70" fill="none"
              stroke={isBreak ? '#2E7D52' : '#2D5BE3'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-4xl leading-none tracking-tight">{fmt(seconds)}</span>
            <span className="text-xs mt-1" style={{ color: '#A8A59E' }}>{phase.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-3">
          <button onClick={toggle} className="flex-1 btn-primary py-3 text-sm">
            {running ? 'Pause' : seconds === totalSeconds ? 'Start' : 'Resume'}
          </button>
          <button onClick={reset} className="btn-secondary px-4">↺</button>
        </div>
        <button onClick={onClose} className="w-full btn-secondary py-2.5 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
