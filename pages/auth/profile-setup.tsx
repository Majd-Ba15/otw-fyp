import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { userAPI } from '../../services/api'
import { I } from '../../components/layout/Layout'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

const FACULTIES = [
  'Faculty of Computing','Faculty of Civil Engineering','Faculty of Electrical Engineering',
  'Faculty of Mechanical Engineering','Faculty of Science','Faculty of Built Environment',
  'Faculty of Management','Faculty of Social Sciences and Humanities',
  'Azman Hashim International Business School','Faculty of Education',
]

async function uploadToLocal(file: File, query = ''): Promise<string | null> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const token = Cookies.get('otw_token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api/upload${query}`, {
      method: 'POST', headers,
      body: JSON.stringify({ base64, name: file.name, type: file.type }),
    })
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

export default function ProfileSetup() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState('')
  const [photo,   setPhoto]   = useState<File | null>(null)
  const [form,    setForm]    = useState({ studentId: '', faculty: '', phone: '', gender: '' })

  const isDriver = (() => { try { const d:any = jwtDecode(Cookies.get('otw_token') || ''); return d.role === 'Driver' } catch { return false } })()

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setPhoto(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const submit = async () => {
    if (!form.studentId || !form.faculty) {
      toast.error('Student ID and Faculty are required')
      return
    }
    setLoading(true)

    // 1. Upload photo to local /public/uploads/ first (no backend needed)
    let photoUrl: string | null = null
    if (photo) {
      photoUrl = await uploadToLocal(photo)
      if (photoUrl) {
        localStorage.setItem('otw_profile_photo', photoUrl)
        toast.success('Photo saved locally ✓')
      }
    }

    // 2. Save profile data to localStorage as reliable fallback
    const profileData = { ...form, photoUrl }
    localStorage.setItem('otw_profile_setup', JSON.stringify(profileData))

    // 3. Navigate forward — never call the backend here because a 401 would
    //    trigger the axios interceptor's window.location redirect to /auth/login
    //    before router.push can fire. The profile data will sync after login.
    toast.success('Profile saved!')
    setLoading(false)
    router.push('/auth/upload-id')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{isDriver ? 'Step 2 of 4' : 'Step 2 of 3'}</div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <h1 className="page-heading">Complete your profile</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Help us verify your identity</p>

          {/* Profile photo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div onClick={() => fileRef.current?.click()}
              style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed var(--green)', background: preview ? 'transparent' : 'var(--green-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', cursor: 'pointer', overflow: 'hidden', transition: 'all .2s' }}>
              {preview
                ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                : <span style={{ width: 30, height: 30, color: 'var(--green)', display: 'flex' }}>{I.camera}</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
              {preview ? 'Change photo' : 'Upload profile photo (optional)'}
            </div>
            {preview && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Saved to device ✓</div>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span style={{ width: 15, height: 15, display: 'flex' }}>{I.user}</span>Student ID number *
            </label>
            <input className="input" placeholder="e.g. A21EC0123"
              value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span style={{ width: 15, height: 15, display: 'flex' }}>{I.id}</span>Faculty *
            </label>
            <div className="select-wrap">
              <select className="input" value={form.faculty} onChange={e => setForm(p => ({ ...p, faculty: e.target.value }))}>
                <option value="">Select faculty</option>
                {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label className="form-label">
                <span style={{ width: 15, height: 15, display: 'flex' }}>{I.phone}</span>Phone
              </label>
              <input className="input" placeholder="+961 XX XXX XXX"
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Gender</label>
              <div className="select-wrap">
                <select className="input" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <div className="notice notice-blue" style={{ marginBottom: 16 }}>
            <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.info}</span>
            <span style={{ fontSize: 12 }}>Photos are stored locally on this server. You can always update them later from your profile.</span>
          </div>

          <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading}>
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
