import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are the OTW (On The Way) AI assistant — a helpful, friendly support bot for a university carpooling platform built for UTM (Universiti Teknologi Malaysia) students.

About OTW:
- OTW connects UTM student drivers and riders for affordable, safe campus carpooling
- All users must be verified UTM students (university email required)
- Drivers need admin approval before posting rides (student ID + driving licence verification)
- Rides are paid in cash — rider pays driver directly on the day
- Prices are set by the driver when posting (typically RM 3–6 per seat)

Key features:
- DRIVERS: Post rides, set route/time/seats/price, accept or decline booking requests, add multiple stops (up to 6), set recurring schedules, rate riders, manage active rides, view earnings
- RIDERS: Search rides by route and date, book seats, join waitlist if full, rate drivers, cancel bookings, view history, save favourite routes
- BOTH: In-app chat between driver and rider, SOS emergency button on active rides, notifications, reports for bad behaviour

How things work:
1. Registration → verify university email (OTP) → set up profile → upload student ID → (drivers: add car & licence) → pending admin approval (drivers only)
2. Booking: rider searches → selects ride → books seat → driver accepts/declines → rider gets email confirmation
3. Active ride: driver starts ride → real-time GPS map shown → driver ends ride → both rate each other
4. Recurring rides: driver enables recurring when posting → picks days (Mon–Sun) → auto-generates future rides
5. Multiple stops: driver adds stops to a posted ride → riders pick their stop when booking
6. Waitlist: full rides allow waitlist sign-up → auto-promoted when a seat opens
7. Reports: users can report safety issues → admin reviews → can warn/suspend/ban users
8. Admin panel: verifies documents, manages all users/rides/reports, views platform analytics

Tone: Be concise, friendly, and helpful. Answer in 2–4 sentences max. If asked something outside OTW, politely redirect to OTW topics. Never make up features that don't exist. If unsure, say "Please contact admin support for more details."`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ reply: 'AI service not configured.' })

  const { message = '', context = 'rider', history = [] } = req.body
  if (!message.trim()) return res.status(400).json({ reply: 'Empty message.' })

  // Build conversation history for multi-turn context
  const contents: any[] = []

  // Include previous turns if passed
  for (const turn of history) {
    if (turn.role === 'user') contents.push({ role: 'user', parts: [{ text: turn.text }] })
    else if (turn.role === 'ai') contents.push({ role: 'model', parts: [{ text: turn.text }] })
  }

  // Add current user message with role context
  const userText = context === 'driver'
    ? `[Driver asking]: ${message}`
    : `[Rider asking]: ${message}`
  contents.push({ role: 'user', parts: [{ text: userText }] })

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', data)
      return res.status(200).json({ reply: getFallback(message, context) })
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!reply) return res.status(200).json({ reply: getFallback(message, context) })

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Gemini fetch error:', err)
    return res.status(200).json({ reply: getFallback(message, context) })
  }
}

// Offline fallback if Gemini is unreachable
function getFallback(message: string, context: string): string {
  const s = message.toLowerCase()
  const d = context === 'driver'
  if (/book|reserve/.test(s)) return d ? "Riders book your ride from the Search page. Accept or decline from Pending Requests." : "Go to Search, enter your route and date, pick a ride, and tap Book Seat."
  if (/cancel/.test(s)) return d ? "Go to Manage Rides and tap Cancel Ride — passengers are notified automatically." : "Go to My Bookings and tap Cancel before the ride departs."
  if (/post|create/.test(s)) return "Tap + Post Ride, fill in the route, time, seats, and price. Enable Recurring Ride to repeat it on set days."
  if (/verif|approv/.test(s)) return "Driver verification takes up to 24 hours. Admin reviews your student ID and licence. You'll get an email once approved."
  if (/rat|star/.test(s)) return "After each completed ride you'll get an email to rate. Ratings are out of 5 stars."
  if (/pay|price|cash/.test(s)) return "OTW uses cash — passengers pay the driver directly. The driver sets the price per seat when posting."
  if (/safe|sos/.test(s)) return "There's an SOS button on the Active Ride screen. All users are verified UTM students."
  return d ? "I'm your OTW driver assistant! Ask me about rides, bookings, ratings, stops, or schedules." : "I'm your OTW assistant! Ask me about booking, payments, cancellations, or safety."
}
