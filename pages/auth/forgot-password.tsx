import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

export default function ForgotPassword() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const submit = async () => {
    if (!email) { toast.error('Enter your university email'); return }
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setSent(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error
      if (msg) {
        toast.error(msg)
      } else {
        // Still show success to not leak whether email exists
        setSent(true)
      }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, background: 'var(--green)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <Link href="/auth/login" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text3)', marginBottom: 24, textDecoration: 'none' }}>
            <span style={{ width: 14, height: 14, display: 'flex' }}>{I.back}</span> Back to sign in
          </Link>

          {!sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, background: 'var(--green-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ width: 28, height: 28, color: 'var(--green)', display: 'flex' }}>{I.lock}</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Forgot your password?</h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>Enter your university email and we will send you a reset link</p>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <span style={{ width: 15, height: 15, display: 'flex' }}>{I.mail}</span> University email
                </label>
                <input className="input" type="email" placeholder="yourname@student.utm.edu.my"
                  value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'var(--green-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span style={{ width: 32, height: 32, color: 'var(--green)', display: 'flex' }}>{I.checkC}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Reset link sent!</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
                Check your inbox at<br /><strong style={{ color: 'var(--text)' }}>{email}</strong><br />
                The link expires in 15 minutes.
              </p>
              <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push('/auth/login')}>Back to sign in</button>
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text3)' }}>
                Didn't get it? <span style={{ color: 'var(--green)', fontWeight: 500, cursor: 'pointer' }} onClick={() => { setSent(false); submit() }}>Resend</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
