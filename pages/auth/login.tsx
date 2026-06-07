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
  const [role,     setRole]     = useState<'Rider'|'Driver'|'Admin'>('Rider')
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      const res = await authAPI.login({ email, password, role })
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

  const roles = [
    { id: 'Rider',  icon: I.user,   label: 'Rider',  desc: 'Find rides' },
    { id: 'Driver', icon: I.car,    label: 'Driver', desc: 'Post rides' },
    { id: 'Admin',  icon: I.shield, label: 'Admin',  desc: 'Manage OTW' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Green topbar */}
      <header style={{ height: 56, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 36, height: 36, background: 'white', borderRadius: 8, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Link href="/auth/register" style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Create account</Link>
      </header>

      <div className="auth-body auth-split-body">
        <div className="auth-split-shell">
          <aside className="auth-split-visual" aria-label="OTW login community">
            <img src="/login.png" alt="Students using OTW rideshare" />
          </aside>

          <div className="auth-card auth-split-card">
          <h1 className="page-heading">Welcome back</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Sign in to continue to OTW</p>

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

          {/* Sign in as */}
          <div className="form-group">
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Sign in as</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {roles.map(r => (
                <button key={r.id} onClick={() => setRole(r.id as any)} style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: role === r.id ? '2px solid var(--green)' : '1.5px solid var(--border2)', background: role === r.id ? 'var(--green-l)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                  <div style={{ width: 28, height: 28, margin: '0 auto 5px', color: role === r.id ? 'var(--green)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: role === r.id ? 'var(--green)' : 'var(--text)', marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                </button>
              ))}
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

          <div className="notice notice-red" style={{ marginTop: 16, marginBottom: 0 }}>
            <span style={{ width: 15, height: 15, display: 'flex', flexShrink: 0 }}>{I.alert}</span>
            Only students with a valid university email can access OTW
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
