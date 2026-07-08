import { useState, Fragment } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

// Larger, friendlier role icons for the "I want to join as" picker — the
// shared nav icons (I.user/I.car) are tuned for 15-16px sidebar use and look
// thin/empty at the 26px size a role card needs, so these are sized and
// weighted for this one spot without touching the shared icon set.
const RiderRoleIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.15" />
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
    <path d="M4.5 20c0-4.2 3.4-6.8 7.5-6.8s7.5 2.6 7.5 6.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
)
const DriverRoleIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
    <path d="M7 9.5l1.1-2.8A1.5 1.5 0 019.5 5.7h5a1.5 1.5 0 011.4 1l1.1 2.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 16l1.3-5A2 2 0 016.7 9.5h10.6a2 2 0 011.9 1.5l1.3 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.75" fill="currentColor" fillOpacity="0.15" />
    <circle cx="7" cy="19.5" r="1.4" fill="currentColor" />
    <circle cx="17" cy="19.5" r="1.4" fill="currentColor" />
  </svg>
)

export default function Register() {
  const router = useRouter()
  const [step,    setStep]    = useState(1)
  const [userId,  setUserId]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [otp,     setOtp]     = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', role: 'Rider' })

  const pwStr = (p: string) => { let s = 0; if(p.length>=8)s++; if(/[A-Z]/.test(p))s++; if(/[0-9]/.test(p))s++; if(/[^A-Za-z0-9]/.test(p))s++; return s }
  const str = pwStr(form.password)
  const strColor = ['#E5E7EB','#EF4444','#F59E0B','#22C55E','#16a85a'][str]
  const strLabel = ['','Weak','Fair','Good','Strong'][str]

  const totalSteps = form.role === 'Driver' ? 5 : 4

  const register = async () => {
    if (!form.fullName || !form.email || !form.password) { toast.error('Fill all fields'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await authAPI.register({ fullName: form.fullName, email: form.email, password: form.password, role: form.role })
      if (res.data.token) Cookies.set('otw_token', res.data.token, { expires: 7 })
      // Store role in localStorage as fallback (in case token doesn't have role)
      localStorage.setItem('otw_user_role', form.role)
      setUserId(res.data.userId)
      if (res.data.requiresOtp) setStep(2)
      else { toast.success('Account created!'); router.push('/auth/profile-setup') }
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Registration failed') }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return }
    if (!userId) { toast.error('Please register again to get a new verification code'); setStep(1); return }
    setLoading(true)
    try {
      const res = await authAPI.verifyOtp({ userId, otpCode: otp })
      if (res.data.token) Cookies.set('otw_token', res.data.token, { expires: 7 })
      // Store role in localStorage (also needed after OTP verification)
      localStorage.setItem('otw_user_role', form.role)
      toast.success('Email verified!')
      router.push('/auth/profile-setup')
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Invalid code') }
    finally { setLoading(false) }
  }

  const resendOtp = async () => {
    if (!userId) { toast.error('Please register again to get a new verification code'); setStep(1); return }
    setResending(true)
    try {
      await authAPI.resendOtp({ userId })
      toast.success('New code sent')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Could not resend code')
    } finally {
      setResending(false)
    }
  }

  const stepLabels = form.role === 'Driver' ? ['Account','Profile','Student ID','Car & Licence'] : ['Account','Profile','Student ID']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 64, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 52, height: 52, background: 'white', borderRadius: 10, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Link href="/auth/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Sign in</Link>
      </header>

      <div className="auth-body-center">
        <div className="login-card" style={{ maxWidth: 480 }}>
          {/* Step indicator */}
          <div className="steps">
            {stepLabels.map((_, i) => (
              <Fragment key={i}>
                <div className={`step-dot ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
                  {step > i + 1 ? <span style={{ width: 13, height: 13, display: 'flex' }}>{I.check}</span> : i + 1}
                </div>
                {i < stepLabels.length - 1 && <div className={`step-line ${step > i + 1 ? 'done' : ''}`} />}
              </Fragment>
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="page-heading">Create your account</h1>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Use your university email to register</p>

              <div className="form-group">
                <label className="form-label"><span style={{ width: 15, height: 15, display: 'flex' }}>{I.user}</span>Full name</label>
                <input className="input" placeholder="Ahmad Karim bin Aziz" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label"><span style={{ width: 15, height: 15, display: 'flex' }}>{I.mail}</span>University email</label>
                <input className="input" type="email" placeholder="yourname@student.utm.edu.my" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label"><span style={{ width: 15, height: 15, display: 'flex' }}>{I.lock}</span>Password</label>
                <div className="input-wrap">
                  <input className="input" type={showPw ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <button className="input-suffix" onClick={() => setShowPw(p => !p)} type="button">
                    <span style={{ width: 17, height: 17, display: 'flex' }}>{showPw ? I.eyeoff : I.eye}</span>
                  </button>
                </div>
                {form.password && <>
                  <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: str >= i ? strColor : 'var(--border)', transition: 'background .2s' }} />)}
                  </div>
                  <div style={{ fontSize: 11, color: strColor, marginTop: 3 }}>{strLabel}</div>
                </>}
              </div>
              <div className="form-group">
                <label className="form-label"><span style={{ width: 15, height: 15, display: 'flex' }}>{I.lock}</span>Confirm password</label>
                <input className="input" type="password" placeholder="Confirm your password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>

              {/* Role picker */}
              <div className="form-group">
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>I want to join as</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[{ id:'Rider', icon:<RiderRoleIcon/>, name:'Rider', desc:'Search and book rides' },{ id:'Driver', icon:<DriverRoleIcon/>, name:'Driver', desc:'Post and manage rides' }].map(r => (
                    <button key={r.id} onClick={() => setForm(p => ({ ...p, role: r.id }))} style={{ flex: 1, padding: '16px 10px', borderRadius: 12, border: form.role === r.id ? '2px solid var(--green)' : '1.5px solid var(--border2)', background: form.role === r.id ? 'var(--green-l)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                      <div style={{ width: 44, height: 44, margin: '0 auto 8px', background: form.role === r.id ? 'var(--green-l2)' : 'var(--bg2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.role === r.id ? 'var(--green)' : 'var(--text3)' }}>{r.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.role === r.id ? 'var(--green)' : 'var(--text)', marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={register} disabled={loading} style={{ marginTop: 4 }}>
                {loading ? 'Creating account...' : 'Continue →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text3)' }}>
                Already have an account? <Link href="/auth/login" style={{ color: 'var(--green)', fontWeight: 500 }}>Sign in</Link>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, background: 'var(--green-l)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ width: 28, height: 28, color: 'var(--green)', display: 'flex' }}>{I.mail}</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Check your inbox</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>We sent a 6-digit code to<br /><strong style={{ color: 'var(--text)' }}>{form.email}</strong></p>
              </div>
              <input className="input" maxLength={6} placeholder="000000" style={{ textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 700, marginBottom: 16 }}
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button className="btn btn-primary btn-full btn-lg" onClick={verifyOtp} disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify email →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 14, color: 'var(--text3)' }}>
                Didn't receive it? <button type="button" style={{ color: 'var(--green)', fontWeight: 500, cursor: resending ? 'default' : 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', opacity: resending ? 0.6 : 1 }} onClick={resendOtp} disabled={resending}>{resending ? 'Sending...' : 'Resend code'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
