import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekStart, weekEnd } = await req.json()

  const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd)
  const { data: sessions } = await supabase.from('focus_sessions').select('*').eq('user_id', user.id).gte('started_at', weekStart)

  const totalMinutes = sessions?.reduce((s, ses) => s + (ses.duration_minutes || 0), 0) || 0
  const metrics = {
    totalTasks: tasks?.length || 0,
    completedTasks: tasks?.filter(t => t.done).length || 0,
    highCompleted: tasks?.filter(t => t.priority === 'high' && t.done).length || 0,
    highTotal: tasks?.filter(t => t.priority === 'high').length || 0,
    carryOvers: tasks?.filter(t => t.carried_over).length || 0,
    focusMinutes: totalMinutes,
    focusSessions: sessions?.length || 0,
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are a productivity coach analysing a user's work week.
Give 3–4 specific, honest, actionable insights based on their data.
Be direct and practical. No fluff. Focus on patterns, not just numbers.
Respond in plain text with short paragraphs. No bullet points, no markdown headers.`,
    messages: [{
      role: 'user',
      content: `Week of ${weekStart}:
- ${metrics.completedTasks}/${metrics.totalTasks} tasks completed (${Math.round((metrics.completedTasks/Math.max(metrics.totalTasks,1))*100)}%)
- High-priority: ${metrics.highCompleted}/${metrics.highTotal} done
- ${metrics.carryOvers} tasks carried over from previous days
- ${Math.round(metrics.focusMinutes/60 * 10)/10} hours of focus sessions across ${metrics.focusSessions} sessions
- Daily tasks: ${JSON.stringify(tasks?.slice(0,30))}

Give me honest insights and specific advice for next week.`
    }]
  })

  const insight = message.content[0].text

  // Save to DB
  await supabase.from('ai_insights').insert({
    user_id: user.id, type: 'weekly',
    week_start: weekStart, content: insight, metrics
  })

  return NextResponse.json({ insight, metrics })
}
