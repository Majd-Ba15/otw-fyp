import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'

export default function Register() {
  const router = useRouter()
  const [step,    setStep]    = useState(1)
  const [userId,  setUserId]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [otp,     setOtp]     = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [agreed,  setAgreed]  = useState(false)
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
    if (!agreed) { toast.error('Please agree to the terms of service'); return }
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

  const stepLabels = form.role === 'Driver' ? ['Account','Profile','Student ID','Car & Licence'] : ['Account','Profile','Student ID']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 64, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 52, height: 52, background: 'white', borderRadius: 10, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Link href="/auth/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>Create account</Link>
      </header>

      <div className="auth-body auth-split-body">
        <div className="auth-split-shell">
          <aside className="auth-split-visual" aria-label="OTW ride sharing community">
            <img src="/register2.png" alt="Students using OTW rideshare" />
          </aside>

          <div className="auth-card auth-split-card">
          {/* Step indicator */}
          <div className="steps">
            {stepLabels.map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 0 }}>
                <div className={`step-dot ${step > i + 1 ? 'done' : step === i + 1 ? 'active' : ''}`}>
                  {step > i + 1 ? <span style={{ width: 13, height: 13, display: 'flex' }}>{I.check}</span> : i + 1}
                </div>
                {i < stepLabels.length - 1 && <div className={`step-line ${step > i + 1 ? 'done' : ''}`} style={{ flex: 1, margin: '0 4px' }} />}
              </div>
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
                  {[{ id:'Rider', icon:I.user, name:'Rider', desc:'Search and book rides' },{ id:'Driver', icon:I.car, name:'Driver', desc:'Post and manage rides' }].map(r => (
                    <button key={r.id} onClick={() => setForm(p => ({ ...p, role: r.id }))} style={{ flex: 1, padding: '14px 10px', borderRadius: 12, border: form.role === r.id ? '2px solid var(--green)' : '1.5px solid var(--border2)', background: form.role === r.id ? 'var(--green-l)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                      <div style={{ width: 38, height: 38, margin: '0 auto 8px', background: form.role === r.id ? 'var(--green-l2)' : 'var(--bg2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: form.role === r.id ? 'var(--green)' : 'var(--text3)' }}>{r.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: form.role === r.id ? 'var(--green)' : 'var(--text)', marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="check-label">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                  <span>I agree to the <span style={{ color: 'var(--green)', fontWeight: 500 }}>terms of service</span> and <span style={{ color: 'var(--green)', fontWeight: 500 }}>privacy policy</span></span>
                </label>
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={register} disabled={loading || !agreed}>
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
                Didn't receive it? <span style={{ color: 'var(--green)', fontWeight: 500, cursor: 'pointer' }} onClick={() => authAPI.resendOtp({ userId })}>Resend code</span>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
