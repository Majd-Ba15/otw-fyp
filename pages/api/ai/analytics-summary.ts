import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const data = req.body?.data || {}
  const fallback = buildFallback(data)
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(200).json(fallback)

  const prompt = `Explain these carpool platform analytics for an admin.
Data: ${JSON.stringify(data)}

Return ONLY JSON:
{"headline":"short headline", "insights":["insight 1","insight 2","insight 3"], "action":"one recommended admin action"}`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 220 },
      }),
    })
    const apiData = await response.json()
    const raw = apiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return res.status(200).json({ ...fallback, ...parsed })
  } catch {
    return res.status(200).json(fallback)
  }
}

function buildFallback(data: any) {
  const bars = data.bars || []
  const topDay = bars.reduce((best: any, item: any) => (item.val || 0) > (best.val || 0) ? item : best, bars[0] || { day: 'N/A', val: 0 })
  const topRoute = data.topRoutes?.[0]

  return {
    headline: 'Platform activity is ready for review',
    insights: [
      `${topDay.day} has the highest ride activity in the weekly chart.`,
      topRoute ? `${topRoute.route} is currently the strongest route.` : 'No dominant route is available yet.',
      `Retention or success is shown as ${data.growth?.retention || 'N/A'}.`,
    ],
    action: 'Use the busiest day and top route to guide driver recruitment and safety monitoring.',
  }
}
