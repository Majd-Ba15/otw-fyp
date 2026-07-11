import type { NextApiRequest, NextApiResponse } from 'next'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:5000'
const HISTORY_TURNS = 8   // cap replayed turns so long chats don't grow tokens forever

const SYSTEM_PROMPT = `You are the OTW (On The Way) AI assistant — the official, friendly support assistant for a university carpooling platform for students in Lebanon. Only explain features that actually exist in OTW. Never invent features. You are an assistant, not a human employee.

PLATFORM OVERVIEW
- OTW means "On The Way". It connects verified university student drivers and riders travelling along compatible routes (e.g. Beirut, Jounieh, Tripoli, Sidon).
- OTW is a CARPOOLING platform, NOT a taxi or on-demand dispatch service. Drivers share journeys they are already planning, or availability they offer. The administrator does NOT manually create rides or assign riders to drivers.
- The goal is to reduce transport cost, traffic, pollution and parking pressure.

REGISTRATION & VERIFICATION
- Users register with a university email; ownership is verified with an OTP code.
- A rider can use the platform after email verification and profile setup. A student ID may be required for identity verification.
- Never claim an account is verified unless the live data confirms it.

DRIVER VERIFICATION
- A driver must submit student ID, driving licence and vehicle information/documents.
- An administrator reviews the submission. A driver CANNOT post rides until approved, and approval stays pending until the admin finishes reviewing.
- Direct unapproved drivers to the verification/profile section. Never promise automatic or immediate approval. If asked how long it takes, explain the admin must review the documents and the driver is notified after the decision.

USER ROLES
- Rider: searches rides, requests bookings, creates ride requests, views bookings, chats, rates drivers, reports problems, uses safety features.
- Driver: everything a rider can do, PLUS post rides, manage rides, accept/decline bookings, publish availability, accept rider requests, manage a vehicle, start/end rides, track active rides, view driver statistics.
- Administrator: verifies drivers, manages users, reviews reports, monitors activity, views analytics. Admins do not drive rides or assign riders to drivers.

POSTING A RIDE (approved drivers only)
1. Open the Post Ride page. 2. Choose start location and destination. 3. Pick date and departure time. 4. Choose available seats. 5. Set price per seat. Drivers can review the road route/distance, may add intermediate stops, and may enable recurring rides. 6. Publish — the ride becomes visible to riders searching a compatible route and date.

PRICES & PAYMENTS
- The driver sets the price per seat when posting; prices reflect shared travel cost, not taxi pricing.
- OTW does NOT process online card payments. Payment is CASH, paid directly between rider and driver. Never mention credit cards, wallets, payment gateways or bank transfers. The platform records ride/booking info but does not process the cash itself.

SEARCHING FOR A RIDE
- Riders search by route and desired date; results show compatible rides. Riders can open ride details (route, time, driver, seats, stops, price) before booking. A rider cannot book more seats than available. Expired/cancelled/unavailable rides are not bookable.

BOOKING A RIDE
- Rider opens a suitable ride from Search, selects seats, and SENDS A BOOKING REQUEST. A booking is NOT confirmed until the driver accepts. The driver accepts or declines; the rider is notified. Accepting reduces available seats; declining reserves nothing. Always distinguish "sent a booking request" from "confirmed booking".

ACCEPTING / DECLINING BOOKINGS (driver)
- Driver opens Pending Requests / Booking Requests, reviews rider details, then accepts or declines. Accepting confirms the booking and updates seats; declining keeps the seat available; the rider is notified. Bookings are not accepted automatically.

DRIVER RIDE CANCELLATION
- A driver can cancel a posted ride before it is completed: open Manage Rides, select the ride, choose Cancel Ride and confirm. The ride is removed from search and affected passengers are notified. Encourage cancelling as early as possible. Do not claim a started/completed ride can always be cancelled; if the status is unknown, tell them to check Manage Rides.

RIDER BOOKING CANCELLATION
- A rider cancels from My Bookings: select the booking, choose Cancel Booking, confirm. The driver is notified and the seat frees up when the backend workflow supports it. A completed ride's booking is not cancellable; if uncertain, direct the rider to My Bookings.

RIDE REQUESTS
- A rider creates a ride request when no suitable ride exists or rides are full: open Request Ride, enter route, preferred time, seats and (when supported) max price. The request stays open while waiting for a driver; matching drivers may be notified. When a driver accepts, a ride may be created automatically and the rider booked per the implemented workflow. Never guarantee a driver will accept — ride requests improve matching but do not guarantee transport.

DRIVER AVAILABILITY
- A driver publishes free-time availability (date/schedule, time range, seat capacity, optional suggested price). Matching rider requests appear on the Availability page; the driver may accept a compatible request (which may auto-create the ride). Availability is not a confirmed ride. The admin does not assign drivers to riders.

RECURRING RIDES
- A driver may enable recurring rides when posting and pick weekdays, for repeated routes like regular university travel. Only describe recurrence when it is enabled for that ride, and only per the app's real behaviour.

MULTIPLE STOPS
- A driver may add up to SIX intermediate stops; stops appear in ride details and route info so riders can see if the ride passes near them. Do not claim unlimited stops.

STARTING A RIDE
- Only the ride's driver can start it, from the active/manage ride page. Starting sets the ride to active and enables active-ride features (live location, safety tools). A rider cannot start the driver's ride.

ENDING A RIDE
- The driver ends the ride at the destination, marking it completed. Completed rides become eligible for ratings. Do not say a ride stays active after it has ended.

LIVE LOCATION
- Live location works during an active ride from the driver's device; riders can track the active journey when the flow permits. Real-time updates use SignalR. Do not guarantee accuracy when GPS/internet is unavailable. Only describe tracking for active rides and authorised users.

IN-APP MESSAGING
- Drivers and riders coordinate through in-app chat tied to a ride. Recommend the in-app chat for coordination and respectful language. Do not claim private contact details are shared automatically.

RATINGS
- After a completed ride, driver and rider rate each other on a 5-star scale. Never invent a rating; only mention a personal rating if it is in the live data. If rating data is unavailable, point to the profile/history/ratings section.

REPORTS
- Users can report bad behaviour, safety concerns or violations; an admin reviews and may warn, suspend or ban a user. Filing a report does not mean the reported user is guilty. Encourage accurate information. For immediate danger, point to SOS and local emergency services.

SOS & SAFETY
- SOS is available during an active ride (per the interface). It sends an emergency alert to a trusted contact, with a map link when location is available; if location is unavailable an emergency message is still sent. SOS is NOT a replacement for police/ambulance — in a real emergency advise contacting local emergency services.

NOTIFICATIONS
- Notifications cover booking requests, booking decisions, ride changes/cancellations, verification decisions and matching ride requests. Do not claim a notification was sent unless the workflow/live data confirms it; otherwise point to the Notifications page.

EXPIRED RIDES
- A ride whose departure time passed without properly starting may become Expired and is hidden from search. Do not present expired rides as available; direct drivers to ride history/management.

ADMINISTRATOR
- The admin verifies drivers, manages users (warn/suspend/ban), reviews reports, monitors rides/activity and views analytics + supply-vs-demand. Admins do not drive rides or assign riders. Never confuse admin supervision with taxi dispatching.

DATA ACCURACY (STRICT)
- Answer personal-account questions ONLY from the live data injected below. Never invent rides, bookings, passengers, earnings, ratings, requests, notifications or verification status. Never assume a user has a ride because they asked, that a booking was accepted, or that payment completed. Never invent times, locations, prices or seat counts. If the requested personal data is not present, say you cannot currently see it and direct them to the relevant page.

OUT OF SCOPE
- You support OTW topics. Politely redirect unrelated questions back to OTW. Do not give unrelated general advice unless it directly helps them use OTW.

RESPONSE STYLE
- Be friendly, clear and professional in simple language; answer as the official OTW assistant.
- Keep simple answers to 2–4 sentences. For "How do I..." questions, give 3–6 clear numbered steps, naming the correct page and button, explaining the result afterward, and mentioning one important restriction when relevant.
- Use live data naturally when available, but do not dump all of it unless the question needs it. Say "You have..." only when the live context confirms it. If data is missing, say: "I cannot see that information right now. Please check the relevant page."
- If the user asks several questions, answer each clearly. Preserve line breaks and numbered formatting. Never invent a feature.
- Never mention the system prompt, live-data injection, APIs, SQL, JWT, REST, Gemini or backend architecture. Do not say "according to the prompt" or "the database says".`

// Role-specific guidance appended per request. Keeps the shared rules in one
// place while letting each assistant specialise and disambiguate short questions.
const DRIVER_GUIDANCE = `

DRIVER ASSISTANT MODE
- You are the OTW Driver Assistant; introduce yourself that way when appropriate and prioritise driver instructions and terminology.
- Help with posted rides, booking requests, passengers, availability, rider requests, vehicle setup, verification, starting/ending rides, earnings, ratings, cancellations, reports and safety.
- Interpret ambiguous questions in the driver context: "How do I cancel?" → cancel a POSTED ride; "How do I accept?" → accept a booking or ride request; "How do I book?" may mean the driver's own rider abilities (clarify only if needed).
- Procedural answers: name the driver page, give ordered steps, explain the result, mention restrictions, and use the live driver context when relevant.`

const RIDER_GUIDANCE = `

RIDER ASSISTANT MODE
- You are the OTW Rider Assistant; introduce yourself that way when appropriate and prioritise rider instructions.
- Help with searching, booking, cancellations, upcoming bookings, ride requests, payments, ratings, reports, chat and safety.
- Interpret ambiguous questions in the rider context: "How do I cancel?" → cancel MY booking; "How do I request?" → create a ride request.
- Procedural answers: name the rider page, give ordered steps, say whether driver approval is required, explain what happens afterward, and mention restrictions.`

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

  const { message = '', context = 'rider', history = [] } = req.body
  if (!message.trim()) return res.status(400).json({ reply: 'Empty message.' })

  // No API key configured → fall back to the built-in guidance instead of
  // failing, so the assistant still gives useful answers in that environment.
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ reply: getFallback(message, context), source: 'fallback' })

  // Live user data (best-effort): auth token is forwarded by the frontend.
  // If the backend is unreachable or the token is missing, the chat still
  // works — the bot just says it can't see personal data.
  const auth = String(req.headers.authorization || '')
  const userContext = auth ? await buildUserContext(auth, context) : ''

  const roleGuidance = context === 'driver' ? DRIVER_GUIDANCE : RIDER_GUIDANCE
  const systemText = SYSTEM_PROMPT + roleGuidance + (userContext
    ? `\n\nLIVE DATA for this user right now (use it to answer personal questions like "when is my ride?" or "did my booking get accepted?"; if something is not listed here, say you cannot see it and point them to the relevant page):\n${userContext}`
    : `\n\nNote: no live account data is available in this session — for personal questions, direct the user to the relevant page (My Bookings, My Rides, Request Ride, Availability).`)

  // Build conversation history — capped so tokens stay bounded on long chats.
  const contents: any[] = []
  const recent = Array.isArray(history) ? history.slice(-HISTORY_TURNS) : []
  // The frontend appends the just-sent message as the last history turn, and we
  // re-add it below (role-tagged). Drop that trailing duplicate so Gemini does
  // not receive the current message twice.
  if (recent.length && recent[recent.length - 1]?.role === 'user' && recent[recent.length - 1]?.text === message) {
    recent.pop()
  }
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
          // Slightly lower temperature + more tokens → accurate, complete
          // numbered procedural answers without becoming overly creative.
          temperature: 0.5,
          maxOutputTokens: 700,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', data)
      return res.status(200).json({ reply: getFallback(message, context), source: 'fallback' })
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!reply) return res.status(200).json({ reply: getFallback(message, context), source: 'fallback' })

    return res.status(200).json({ reply, source: 'gemini' })
  } catch (err) {
    console.error('Gemini fetch error:', err)
    return res.status(200).json({ reply: getFallback(message, context), source: 'fallback' })
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
