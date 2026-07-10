import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000'
const HISTORY_TURNS = 8   // cap replayed turns so long chats don't grow tokens forever

const SYSTEM_PROMPT = `You are the OTW (On The Way) AI assistant — a helpful, friendly support bot for a university carpooling platform for students in Lebanon.

About OTW:
- OTW connects verified university student drivers and riders for affordable, safe carpooling (e.g. Beirut, Jounieh, Tripoli, Sidon routes)
- All users must be verified students (university email + OTP verification)
- Drivers need admin approval before posting rides (student ID + driving licence verification)
- Rides are paid in cash — rider pays the driver directly on the day
- Prices are set manually by the driver when posting (typically $3–8 per seat)

Key features:
- DRIVERS: Post rides (with a real road-route preview and distance), set route/time/seats/price, accept or decline booking requests, add multiple stops (up to 6), set recurring schedules, publish free-time AVAILABILITY slots, accept rider RIDE REQUESTS (accepting instantly creates the ride and books the rider), rate riders, manage active rides with live GPS, view earnings
- RIDERS: Search rides by route and date, book seats, create a RIDE REQUEST when no ride exists or a ride is full (pick route, time, seats, max price — matching available drivers are notified), rate drivers, cancel bookings, view history, save favourite routes
- BOTH: In-app chat between driver and rider, SOS emergency button on active rides, notifications, reports for bad behaviour

How things work:
1. Registration → verify email (OTP) → set up profile → upload student ID → (drivers: add car & licence) → pending admin approval (drivers only)
2. Booking: rider searches → selects ride → books seat → driver accepts/declines → rider gets email confirmation
3. Ride requests (when no ride fits): rider creates a request from the Request Ride page → drivers with matching availability get notified → a driver accepts → the ride is created automatically and the rider's seat is confirmed
4. Driver availability: driver adds free time slots on the Availability page (date + from/until time, seats, suggested price) → sees matching rider requests there
5. Active ride: driver starts ride → real-time GPS map shown → driver ends ride → both rate each other
6. Recurring rides: driver enables recurring when posting → picks days (Mon–Sun) → repeats automatically
7. Multiple stops: driver adds stops to a posted ride → stops appear on the rider's search cards, map and ride details
8. Full rides: when a ride has no seats left, the rider creates a ride request on that route instead → matching drivers get notified
9. Expired rides: rides whose time has passed without starting are marked Expired and hidden from search
10. Reports: users can report safety issues → admin reviews → can warn/suspend/ban users
11. Admin panel: verifies documents, manages users/rides/reports, analytics with supply-vs-demand planning by weekday and hour

Tone: Be concise, friendly, and helpful. Answer in 2–4 sentences max. If asked something outside OTW, politely redirect to OTW topics. Never make up features that don't exist. If unsure, say "Please contact admin support for more details."`

// ── Backend fetch with auth + timeout: chat must stay functional when the
//    backend is down, so every failure returns null instead of throwing. ──
async function bget(path: string, auth: string): Promise<any | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3500)
    const res = await fetch(`${BACKEND}${path}`, { headers: { Authorization: auth }, signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleString('en', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

// ── Compact live-data context (~50–200 tokens) so the bot can answer
//    personal questions ("when is my ride?") for BOTH roles. ──
async function buildUserContext(auth: string, context: string): Promise<string> {
  const lines: string[] = []

  if (context === 'driver') {
    const [me, rides, bookingReqs, openDemand] = await Promise.all([
      bget('/api/users/me', auth),
      bget('/api/rides/mine', auth),
      bget('/api/bookings/requests', auth),
      bget('/api/demand/requests/open', auth),
    ])
    if (me) lines.push(`Driver: ${me.fullName}, ${me.isVerified ? 'verified' : 'NOT verified yet (pending admin approval)'}.`)
    const upcoming = (Array.isArray(rides) ? rides : [])
      .filter((r: any) => r.status === 'Upcoming' && new Date(r.departureTime) > new Date())
      .slice(0, 3)
    lines.push(upcoming.length
      ? 'Upcoming posted rides: ' + upcoming.map((r: any) =>
          `${r.fromLocation}→${r.toLocation} ${fmtTime(r.departureTime)} (${(r.totalSeats - r.availableSeats)}/${r.totalSeats} seats booked, $${r.pricePerSeat})`).join('; ')
      : 'No upcoming posted rides.')
    if (Array.isArray(bookingReqs) && bookingReqs.length) lines.push(`Pending booking requests waiting for accept/decline: ${bookingReqs.length}.`)
    if (Array.isArray(openDemand) && openDemand.length) lines.push(`Open rider ride-requests the driver could take: ${openDemand.length} (shown on the Availability page).`)
  } else {
    const [me, bookings, myReqs] = await Promise.all([
      bget('/api/users/me', auth),
      bget('/api/bookings/upcoming', auth),
      bget('/api/demand/requests/mine', auth),
    ])
    if (me) lines.push(`Rider: ${me.fullName}, ${me.isVerified ? 'verified' : 'not verified yet'}.`)
    const b = (Array.isArray(bookings) ? bookings : []).slice(0, 3)
    lines.push(b.length
      ? 'Upcoming bookings: ' + b.map((x: any) =>
          `${x.ride?.fromLocation}→${x.ride?.toLocation} ${fmtTime(x.ride?.departureTime)} (${x.status}, ${x.seatsBooked} seat${x.seatsBooked > 1 ? 's' : ''}, driver ${x.ride?.driver?.fullName ?? '—'})`).join('; ')
      : 'No upcoming bookings.')
    const open = (Array.isArray(myReqs) ? myReqs : []).filter((r: any) => r.status === 'Open').slice(0, 2)
    if (open.length) lines.push('Open ride requests: ' + open.map((r: any) =>
      `${r.fromLocation}→${r.toLocation} ${fmtTime(r.desiredTime)} (still waiting for a driver)`).join('; '))
  }

  return lines.join('\n')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ reply: 'AI service not configured.' })

  const { message = '', context = 'rider', history = [] } = req.body
  if (!message.trim()) return res.status(400).json({ reply: 'Empty message.' })

  // Live user data (best-effort): auth token is forwarded by the frontend.
  // If the backend is unreachable or the token is missing, the chat still
  // works — the bot just says it can't see personal data.
  const auth = String(req.headers.authorization || '')
  const userContext = auth ? await buildUserContext(auth, context) : ''

  const systemText = SYSTEM_PROMPT + (userContext
    ? `\n\nLIVE DATA for this user right now (use it to answer personal questions like "when is my ride?" or "did my booking get accepted?"; if something is not listed here, say you cannot see it and point them to the relevant page):\n${userContext}`
    : `\n\nNote: no live account data is available in this session — for personal questions, direct the user to the relevant page (My Bookings, My Rides, Request Ride, Availability).`)

  // Build conversation history — capped so tokens stay bounded on long chats
  const contents: any[] = []
  const recent = Array.isArray(history) ? history.slice(-HISTORY_TURNS) : []
  for (const turn of recent) {
    if (turn.role === 'user') contents.push({ role: 'user', parts: [{ text: turn.text }] })
    else if (turn.role === 'ai') contents.push({ role: 'model', parts: [{ text: turn.text }] })
  }

  const userText = context === 'driver'
    ? `[Driver asking]: ${message}`
    : `[Rider asking]: ${message}`
  contents.push({ role: 'user', parts: [{ text: userText }] })

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemText }] },
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
  if (/request|no ride|availab/.test(s)) return d ? "Add your free time on the Availability page — matching rider requests appear there and accepting one creates the ride automatically." : "If no ride fits, use Request Ride: set your route, time and seats — available drivers get notified and can accept."
  if (/book|reserve/.test(s)) return d ? "Riders send booking requests from the Search page. Accept or decline them from Pending Requests." : "Go to Search, enter your route and date, pick a trip, and tap Send request to book."
  if (/cancel/.test(s)) return d ? "Go to Manage Rides and tap Cancel Ride — passengers are notified automatically." : "Go to My Bookings and tap Cancel before the ride departs."
  if (/post|create/.test(s)) return "Tap + Post Ride, fill in the route, time, seats, and price. Enable Recurring Ride to repeat it on set days."
  if (/verif|approv/.test(s)) return "Driver verification takes up to 24 hours. Admin reviews your student ID and licence. You'll get an email once approved."
  if (/rat|star/.test(s)) return "After each completed ride you'll get an email to rate. Ratings are out of 5 stars."
  if (/pay|price|cash/.test(s)) return "OTW uses cash — passengers pay the driver directly. The driver sets the price per seat when posting."
  if (/safe|sos/.test(s)) return "There's an SOS button on the Active Ride screen. All users are verified students."
  return d ? "I'm your OTW driver assistant! Ask me about rides, bookings, ratings, stops, availability, or rider requests." : "I'm your OTW assistant! Ask me about booking, ride requests, payments, cancellations, or safety."
}
