import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const data = req.body?.data || {}
  const fallback = buildFallback(data)
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(200).json(fallback)

  const prompt = `You are the analytics assistant of a university carpooling platform.
Analyse the data and find what is NOT obvious: the single biggest anomaly or supply-demand gap.
"slots" contains per day-of-week and hour {dow: 0=Sunday..6=Saturday, hour, supply: rides posted, demand: ride requests, gap} — a positive gap means unmet rider demand at that day+hour; name the weekday in your answer.
Prev-window fields (newUsersPrev, ridesPrev, volumePrev, utilizationPrev) allow week-over-week comparison.

Data: ${JSON.stringify(data).slice(0, 6000)}

Return ONLY JSON:
{"headline":"short headline",
 "insights":["the biggest anomaly or gap with numbers","one causal hypothesis","one more notable pattern"],
 "action":"one specific admin action, e.g. recommend drivers post at a specific hour/route"}`

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

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function buildFallback(data: any) {
  const slots = data.slots || []
  const gap = slots.reduce((best: any, h: any) => (h.gap || 0) > (best?.gap || 0) ? h : best, null)
  const tr = data.topRoutes?.[0]
  const topRoute = tr ? (tr.route || `${tr.fromLocation} → ${tr.toLocation}`) : null

  return {
    headline: 'Platform activity is ready for review',
    insights: [
      gap && gap.gap > 0
        ? `Biggest supply gap on ${DOW[gap.dow] ?? 'N/A'} at ${String(gap.hour).padStart(2, '0')}:00 — ${gap.demand} riders wanting rides vs ${gap.supply} rides posted.`
        : 'Supply currently covers rider demand across all time slots.',
      topRoute ? `${topRoute} is currently the strongest route.` : 'No dominant route is available yet.',
      `Seat utilization is ${data.utilization ?? 'N/A'}% (${data.utilizationPrev ?? 'N/A'}% previous period).`,
    ],
    action: gap && gap.gap > 0
      ? `Recommend drivers post rides on ${DOW[gap.dow] ?? 'the busiest day'} around ${String(gap.hour).padStart(2, '0')}:00 to absorb unmet demand.`
      : 'Use the busiest day and top route to guide driver recruitment and safety monitoring.',
  }
}
