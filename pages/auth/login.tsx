import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authAPI, userAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

export default function Login() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      // The account's role is looked up server-side from the email — there is
      // no role picker. The user is routed to whichever dashboard they own.
      const res = await authAPI.login({ email, password })
      const { token, name, role: r } = res.data
      Cookies.set('otw_token', token, { expires: remember ? 30 : 7 })
      toast.success(`Welcome back, ${name || 'User'}!`)
      if (r === 'Rider') {
        router.push('/rider/dashboard')
      } else if (r === 'Admin') {
        router.push('/admin/dashboard')
      } else if (r === 'Driver') {
        try {
          const me = await userAPI.getMe()
          router.push(me.data.isVerified ? '/driver/dashboard' : '/driver/pending')
        } catch {
          router.push('/driver/dashboard')
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Green topbar */}
      <header style={{ height: 72, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(12px, 4vw, 24px)' }}>
        <div style={{ width: 'clamp(56px, 14vw, 64px)', height: 'clamp(56px, 14vw, 64px)', background: 'white', borderRadius: 12, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Link href="/auth/register" style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Create account</Link>
      </header>

      <div className="auth-body-center">
        <div className="login-card">
          <h1 className="page-heading" style={{ textAlign: 'center' }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, textAlign: 'center' }}>Sign in to continue to OTW</p>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ width: 15, height: 15, display: 'flex' }}>{I.mail}</span> University email
            </label>
            <input className="input" type="email" placeholder="yourname@student.utm.edu.my"
              value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span style={{ width: 15, height: 15, display: 'flex' }}>{I.lock}</span> Password
              </label>
              <Link href="/auth/forgot-password" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>Forgot password?</Link>
            </div>
            <div className="input-wrap">
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button className="input-suffix" onClick={() => setShowPw(p => !p)} type="button">
                <span style={{ width: 17, height: 17, display: 'flex' }}>{showPw ? I.eyeoff : I.eye}</span>
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ marginBottom: 20 }}>
            <label className="check-label">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
            </label>
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text3)' }}>
            No account yet? <Link href="/auth/register" style={{ color: 'var(--green)', fontWeight: 500 }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
