import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tasks, profile } = await req.json()
  const deepStart = profile?.deep_work_start || '09:00'
  const deepEnd   = profile?.deep_work_end   || '12:00'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: `You are a time-blocking productivity assistant.
Build a realistic daily schedule for the user based on their tasks and preferences.
Rules:
- Deep work block is ${deepStart}–${deepEnd} (HIGH priority tasks only, protected, no interruptions)
- Group MEDIUM tasks into a single focused block after lunch (13:00–15:30)
- LOW tasks go into a quick-wins block (15:30–17:00)
- Include short buffers between blocks
- Don't overschedule — be realistic about what fits
Respond ONLY with a JSON array of time blocks. No markdown, no explanation.
Format: [{"time": "09:00", "end": "12:00", "type": "deep_work|medium_cluster|quick_wins|buffer", "label": "block name", "tasks": ["task name 1"], "tip": "short coaching tip"}]`,
    messages: [{
      role: 'user',
      content: `Today's tasks: ${JSON.stringify(tasks)}
Deep work window: ${deepStart}–${deepEnd}
Build my schedule as JSON array only.`
    }]
  })

  try {
    const text = message.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const schedule = JSON.parse(clean)
    return NextResponse.json({ schedule })
  } catch {
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
