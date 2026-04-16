import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '../../lib/supabase'
import DashboardClient from '../../components/DashboardClient'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = format(new Date(), 'yyyy-MM-dd')

  const [{ data: tasks }, { data: profile }, { data: schedule }, { data: carryOver }] = await Promise.all([
    supabase.from('tasks').select('*').eq('date', today).order('created_at'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('daily_schedules').select('*').eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('tasks').select('*').lt('date', today).eq('done', false).order('date', { ascending: false }).limit(5),
  ])

  return (
    <DashboardClient
      user={user}
      profile={profile}
      initialTasks={tasks || []}
      initialSchedule={schedule?.schedule || null}
      carryOverTasks={carryOver || []}
      today={today}
    />
  )
}
