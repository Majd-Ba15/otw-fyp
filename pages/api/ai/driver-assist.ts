import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const { from = '', to = '', seats = 1, departureTime = '', mode = 'both' } = req.body || {}
  const fallback = buildFallback({ from, to, seats, departureTime })
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) return res.status(200).json(filterMode(fallback, mode))

  const prompt = `You help a student driver create a carpool ride.
Route: ${from || 'Unknown'} to ${to || 'Unknown'}
Seats: ${seats}
Departure: ${departureTime || 'Not set'}

Return ONLY JSON:
{"price": number, "priceReason": "short reason", "description": "friendly note under 25 words"}

Use student-friendly pricing.`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 140 },
      }),
    })
    const data = await response.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return res.status(200).json(filterMode({ ...fallback, ...parsed }, mode))
  } catch {
    return res.status(200).json(filterMode(fallback, mode))
  }
}

function buildFallback({ from, to, seats, departureTime }: any) {
  const routeText = `${from || 'pickup'} to ${to || 'destination'}`
  const hour = departureTime ? new Date(departureTime).getHours() : 12
  const peak = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)
  const distanceHint = Math.min(10, Math.max(0, Math.ceil(routeText.length / 12)))
  const price = Math.max(3, Math.min(20, 3 + distanceHint + (peak ? 2 : 0) - (Number(seats) > 3 ? 1 : 0)))

  return {
    price,
    priceReason: `Suggested from route length, ${peak ? 'peak travel time' : 'normal travel time'}, and ${seats} seat${Number(seats) === 1 ? '' : 's'}.`,
    description: `Leaving from ${from || 'pickup point'} to ${to || 'destination'}. Friendly ride, please be on time.`,
  }
}

function filterMode(result: any, mode: string) {
  if (mode === 'price') return { price: result.price, priceReason: result.priceReason }
  if (mode === 'description') return { description: result.description }
  return result
}
