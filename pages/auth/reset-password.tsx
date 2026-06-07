import { useState } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

export default function ResetPassword() {
  const router = useRouter()
  const { token } = router.query
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const submit = async () => {
    if (!password)              { toast.error('Enter a new password'); return }
    if (password.length < 8)    { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm)   { toast.error('Passwords do not match'); return }
    if (!token)                 { toast.error('Invalid or missing reset token'); return }
    setLoading(true)
    try {
      await authAPI.resetPassword(token as string, { password })
      setDone(true)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error
      toast.error(msg || 'Link expired or invalid. Please request a new one.')
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
          {!done ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, background: 'var(--green-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ width: 28, height: 28, color: 'var(--green)', display: 'flex' }}>{I.lock}</span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Set new password</h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>Enter a new password for your account</p>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span style={{ width: 15, height: 15, display: 'flex' }}>{I.lock}</span> New password
                </label>
                <input className="input" type="password" placeholder="At least 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span style={{ width: 15, height: 15, display: 'flex' }}>{I.lock}</span> Confirm password
                </label>
                <input className="input" type="password" placeholder="Re-enter your password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading}>
                {loading ? 'Saving...' : 'Set new password'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'var(--green-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span style={{ width: 32, height: 32, color: 'var(--green)', display: 'flex' }}>{I.checkC}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Password updated!</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button className="btn btn-primary btn-full btn-lg" onClick={() => router.push('/auth/login')}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
