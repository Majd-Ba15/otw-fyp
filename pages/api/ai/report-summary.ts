import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const { title = '', statement = '', filedBy = '', against = '' } = req.body || {}
  const fallback = summarizeFallback(`${title} ${statement}`)
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(200).json(fallback)

  const prompt = `Summarize this carpool safety report for an admin.
Filed by: ${filedBy || 'Unknown'}
Against: ${against || 'Unknown'}
Title: ${title}
Statement: ${statement}

Return ONLY JSON:
{"summary":"one sentence", "priority":"Low|Medium|High", "suggestedAction":"short admin action"}`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 160 },
      }),
    })
    const data = await response.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return res.status(200).json({ ...fallback, ...parsed })
  } catch {
    return res.status(200).json(fallback)
  }
}

function summarizeFallback(text: string) {
  const s = text.toLowerCase()
  const high = /speed|unsafe|danger|harass|threat|assault|crash|accident|phone|drunk|violence/.test(s)
  const medium = /late|cancel|rude|payment|cash|no.?show|argument|dirty/.test(s)
  const priority = high ? 'High' : medium ? 'Medium' : 'Low'
  const suggestedAction =
    priority === 'High' ? 'Review ride history and consider suspension while investigating.' :
    priority === 'Medium' ? 'Contact both users and consider a warning if confirmed.' :
    'Log the report and monitor for repeated issues.'

  return {
    summary: text.trim() ? text.trim().replace(/\s+/g, ' ').slice(0, 150) : 'No report details were provided.',
    priority,
    suggestedAction,
  }
}
