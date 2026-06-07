import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { userAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

const CHECKS = [
  { label: 'University email verified',  done: true  },
  { label: 'Student ID uploaded',        done: true  },
  { label: 'Driving licence uploaded',   done: true  },
  { label: 'Car details submitted',      done: true  },
  { label: 'Admin review',               done: false },
]

const REMIND_KEY = 'otw_last_reminder'
const COOLDOWN_MS = 24 * 60 * 60 * 1000

export default function DriverPending() {
  const router = useRouter()
  const [checking,  setChecking]  = useState(false)
  const [reminding, setReminding] = useState(false)
  const [lastSent,  setLastSent]  = useState<number | null>(null)

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (!token) { router.replace('/auth/login'); return }
    try { const d: any = jwtDecode(token); if (d.role !== 'Driver') router.replace('/auth/login') } catch { router.replace('/auth/login') }
    const saved = localStorage.getItem(REMIND_KEY)
    if (saved) setLastSent(parseInt(saved))
  }, [])

  const checkStatus = async () => {
    setChecking(true)
    try {
      const res = await userAPI.getMe()
      if (res.data.isVerified) {
        router.replace('/driver/dashboard')
      } else {
        alert('Your account is still under review. We will notify you by email once approved.')
      }
    } catch {
      alert('Could not check status. Please try again.')
    } finally { setChecking(false) }
  }

  const sendReminder = async () => {
    setReminding(true)
    try {
      await userAPI.remindVerification()
      const now = Date.now()
      localStorage.setItem(REMIND_KEY, String(now))
      setLastSent(now)
      alert('Reminder sent to admin! They will review your account soon.')
    } catch {
      alert('Could not send reminder. Please try again.')
    } finally { setReminding(false) }
  }

  const canRemind = !lastSent || (Date.now() - lastSent) > COOLDOWN_MS
  const hoursLeft = lastSent ? Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 3600000) : 0

  const logout = () => {
    Cookies.remove('otw_token')
    router.replace('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 56, background: 'var(--blue)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>OTW Driver</span>
        <button onClick={logout} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 14px', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          Logout
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: 460, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, boxShadow: 'var(--shadow)' }}>

          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ width: 36, height: 36, color: 'var(--blue)', display: 'flex' }}>{I.shield}</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Verification pending</h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
              Your documents are under review. Admin will verify within <strong style={{ color: 'var(--text)' }}>24 hours</strong>.
            </p>
          </div>

          {/* Checklist */}
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
            {CHECKS.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < CHECKS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: c.done ? 'var(--green-l)' : '#FEF3E2' }}>
                  {c.done
                    ? <span style={{ width: 14, height: 14, color: 'var(--green)', display: 'flex' }}>{I.check}</span>
                    : <span style={{ width: 14, height: 14, color: '#F59E0B', display: 'flex' }}>{I.clock}</span>
                  }
                </div>
                <span style={{ fontSize: 13, color: c.done ? 'var(--text)' : 'var(--text3)', fontWeight: c.done ? 500 : 400 }}>{c.label}</span>
                {!c.done && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#F59E0B', fontWeight: 600, background: '#FEF3E2', padding: '2px 8px', borderRadius: 20 }}>Pending</span>}
              </div>
            ))}
          </div>

          {/* Notice */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ width: 16, height: 16, color: 'var(--blue)', flexShrink: 0, marginTop: 1, display: 'flex' }}>{I.mail}</span>
            <div style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.6 }}>
              You will receive an <strong>email notification</strong> once your account is approved or if additional information is needed.
            </div>
          </div>

          <button
            onClick={checkStatus}
            disabled={checking}
            className="btn btn-full"
            style={{ background: 'var(--blue)', color: 'white', marginBottom: 10, border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: checking ? 0.7 : 1 }}
          >
            {checking ? 'Checking...' : 'Check approval status'}
          </button>

          <button
            onClick={sendReminder}
            disabled={reminding || !canRemind}
            className="btn btn-full"
            style={{ background: canRemind ? '#F59E0B' : 'var(--bg)', color: canRemind ? 'white' : 'var(--text3)', marginBottom: 10, border: canRemind ? 'none' : '1px solid var(--border)', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: canRemind ? 'pointer' : 'not-allowed' }}
          >
            {reminding ? 'Sending...' : canRemind ? 'Send reminder to admin' : `Reminder sent — wait ${hoursLeft}h`}
          </button>

          <button onClick={logout} className="btn btn-secondary btn-full">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
