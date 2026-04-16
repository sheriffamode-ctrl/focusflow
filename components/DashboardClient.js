'use client'
import { useState, useEffect, useRef } from 'react'
import { format, isToday } from 'date-fns'
import { createClient } from '../lib/supabase'
import Nav from './Nav'
import MorningScreen from './MorningScreen'
import TodayScreen from './TodayScreen'
import WeeklyScreen from './WeeklyScreen'
import PomodoroModal from './PomodoroModal'
import Toast from './Toast'

export default function DashboardClient({ user, profile, initialTasks, initialSchedule, carryOverTasks, today }) {
  const [screen, setScreen] = useState(initialTasks.length === 0 ? 'morning' : 'today')
  const [tasks, setTasks] = useState(initialTasks)
  const [schedule, setSchedule] = useState(initialSchedule)
  const [toast, setToast] = useState(null)
  const [pomodoroTask, setPomodoroTask] = useState(null)
  const supabase = createClient()

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleTasksConfirmed(newTasks) {
    // Save tasks to Supabase
    const { data: { user: u } } = await supabase.auth.getUser()
    const rows = newTasks.map(t => ({
      user_id: u.id,
      name: t.name,
      priority: t.priority,
      date: today,
      done: false,
    }))
    const { data, error } = await supabase.from('tasks').insert(rows).select()
    if (!error && data) {
      setTasks(prev => [...prev, ...data])
      showToast('Tasks saved!')
    }
  }

  async function handleCarryOver(carryTasks) {
    const { data: { user: u } } = await supabase.auth.getUser()
    const rows = carryTasks.map(t => ({
      user_id: u.id,
      name: t.name,
      priority: t.priority,
      date: today,
      done: false,
      carried_over: true,
      source_date: t.date,
    }))
    const { data, error } = await supabase.from('tasks').insert(rows).select()
    if (!error && data) {
      setTasks(prev => [...prev, ...data])
      showToast(`${data.length} tasks carried over`)
    }
  }

  async function handleScheduleBuilt(newSchedule) {
    setSchedule(newSchedule)
    const { data: { user: u } } = await supabase.auth.getUser()
    await supabase.from('daily_schedules').upsert({
      user_id: u.id, date: today, schedule: newSchedule
    }, { onConflict: 'user_id,date' })
    setScreen('today')
    showToast('Your day is scheduled!')
  }

  async function handleToggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const updates = {
      done: !task.done,
      completed_at: !task.done ? new Date().toISOString() : null
    }
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', taskId).select().single()
    if (!error && data) {
      setTasks(prev => prev.map(t => t.id === taskId ? data : t))
      if (!task.done) showToast('Task completed ✓')
    }
  }

  async function handleUpdatePriority(taskId, priority) {
    const { data, error } = await supabase.from('tasks').update({ priority }).eq('id', taskId).select().single()
    if (!error && data) setTasks(prev => prev.map(t => t.id === taskId ? data : t))
  }

  async function handleDeleteTask(taskId) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F5F0' }}>
      <Nav
        screen={screen}
        setScreen={setScreen}
        user={user}
        onSignOut={handleSignOut}
        tasks={tasks}
      />

      {screen === 'morning' && (
        <MorningScreen
          today={today}
          profile={profile}
          carryOverTasks={carryOverTasks}
          existingTasks={tasks}
          onTasksConfirmed={handleTasksConfirmed}
          onCarryOver={handleCarryOver}
          onScheduleBuilt={handleScheduleBuilt}
          onGoToToday={() => setScreen('today')}
          showToast={showToast}
        />
      )}

      {screen === 'today' && (
        <TodayScreen
          tasks={tasks}
          schedule={schedule}
          today={today}
          profile={profile}
          onToggleTask={handleToggleTask}
          onUpdatePriority={handleUpdatePriority}
          onDeleteTask={handleDeleteTask}
          onStartFocus={setPomodoroTask}
          onAddTask={() => setScreen('morning')}
          showToast={showToast}
        />
      )}

      {screen === 'weekly' && (
        <WeeklyScreen
          user={user}
          today={today}
          showToast={showToast}
        />
      )}

      {pomodoroTask && (
        <PomodoroModal
          task={pomodoroTask}
          onClose={() => setPomodoroTask(null)}
          onComplete={async (minutes) => {
            const { data: { user: u } } = await supabase.auth.getUser()
            await supabase.from('focus_sessions').insert({
              user_id: u.id,
              task_id: pomodoroTask.id || null,
              duration_minutes: minutes,
              completed: true,
              ended_at: new Date().toISOString(),
            })
            showToast('Focus session saved 🎯')
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  )
}
