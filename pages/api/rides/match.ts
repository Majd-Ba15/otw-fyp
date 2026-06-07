import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !req.body?.rides?.length) return res.status(200).json({ bestId: null, reason: '' })

  const { rides, from, to, seats } = req.body

  const rideList = rides.map((r: any, i: number) =>
    `Ride ${i + 1} (ID: ${r.rideId || r.id}): ${r.fromLocation} → ${r.toLocation}, ` +
    `departs ${r.departureTime ? new Date(r.departureTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : 'unknown'}, ` +
    `RM${r.pricePerSeat}/seat, ${r.availableSeats ?? r.totalSeats - r.bookedSeats ?? '?'} seats left, ` +
    `driver: ${r.driver?.fullName || 'Unknown'} (rating: ${r.driver?.averageRating ?? '?'}, ${r.driver?.tripCount ?? 0} trips, verified: ${r.driver?.isVerified ? 'yes' : 'no'})`
  ).join('\n')

  const prompt = `A university student wants to go from "${from || 'UTM'}" to "${to}" and needs ${seats} seat(s).

Available rides:
${rideList}

Pick the single BEST ride for this student considering: route match, departure time, price (lower is better for students), driver rating (higher is better), and seat availability. Reply with ONLY a JSON object in this exact format, no markdown, no explanation:
{"bestId": <rideId number>, "reason": "<one short sentence why this is the best match>"}`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
      }),
    })

    const data = await response.json()
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    // Strip any markdown code fences if Gemini adds them
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json({ bestId: parsed.bestId, reason: parsed.reason || '' })
  } catch {
    return res.status(200).json({ bestId: null, reason: '' })
  }
}
