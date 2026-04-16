import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rawText, existingTasks } = await req.json()

  // Fetch user's recent history for context
  const { data: history } = await supabase
    .from('tasks')
    .select('name, priority, done, date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are a productivity AI that classifies tasks for a busy professional.
Analyse the user's task history to understand their patterns.
Classify each task as: high (deep focus required, significant impact, deadline-driven), medium (important but not urgent, can be batched), or low (quick, routine, admin).
Respond ONLY with a JSON array. No markdown, no explanation.
Format: [{"name": "task name", "priority": "high|medium|low", "reason": "brief reason"}]`,
    messages: [{
      role: 'user',
      content: `My task history (last 50 tasks): ${JSON.stringify(history || [])}

Tasks to classify today:
${rawText}

${existingTasks?.length ? `Already classified: ${JSON.stringify(existingTasks)}` : ''}

Return JSON array only.`
    }]
  })

  try {
    const text = message.content[0].text.trim()
    const clean = text.replace(/```json|```/g, '').trim()
    const tasks = JSON.parse(clean)
    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
