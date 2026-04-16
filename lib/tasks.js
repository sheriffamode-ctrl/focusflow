import { createClient } from './supabase'

export async function getTodaysTasks(date) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createTasks(tasks) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rows = tasks.map(t => ({ ...t, user_id: user.id }))
  const { data, error } = await supabase.from('tasks').insert(rows).select()
  if (error) throw error
  return data
}

export async function updateTask(id, updates) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function getCarryOverTasks(beforeDate) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .lt('date', beforeDate)
    .eq('done', false)
    .order('date', { ascending: false })
    .limit(10)
  if (error) throw error
  return data
}

export async function carryOverTasks(tasks, toDate) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const rows = tasks.map(t => ({
    user_id: user.id,
    name: t.name,
    priority: t.priority,
    date: toDate,
    carried_over: true,
    source_date: t.date,
    done: false,
  }))
  const { data, error } = await supabase.from('tasks').insert(rows).select()
  if (error) throw error
  return data
}

export async function saveFocusSession(taskId, durationMinutes, completed) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('focus_sessions').insert({
    user_id: user.id,
    task_id: taskId,
    duration_minutes: durationMinutes,
    completed,
    ended_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getWeeklyStats(weekStart, weekEnd) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('date', weekStart)
    .lte('date', weekEnd)
  if (error) throw error

  const total = data.length
  const done = data.filter(t => t.done).length
  const high = data.filter(t => t.priority === 'high')
  const highDone = high.filter(t => t.done).length
  const carryOvers = data.filter(t => t.carried_over).length

  return { total, done, high: high.length, highDone, carryOvers, completionRate: total ? Math.round((done/total)*100) : 0 }
}

export async function saveSchedule(date, schedule, aiNotes) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('daily_schedules').upsert({
    user_id: user.id, date, schedule, ai_notes: aiNotes,
  }, { onConflict: 'user_id,date' })
  if (error) throw error
}

export async function getSchedule(date) {
  const supabase = createClient()
  const { data } = await supabase.from('daily_schedules').select('*').eq('date', date).maybeSingle()
  return data
}
