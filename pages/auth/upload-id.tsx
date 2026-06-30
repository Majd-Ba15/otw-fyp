import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import toast from 'react-hot-toast'
import { I } from '../../components/layout/Layout'
import { userAPI } from '../../services/api'

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

export default function UploadId() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file,    setFile]    = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  // Check driver role synchronously (like profile-setup does)
  const isDriver = (() => {
    try {
      const d: any = jwtDecode(Cookies.get('otw_token') || '')
      if (d.role === 'Driver') return true
    } catch (e) {
      // Token decode failed, check localStorage fallback
    }
    // Fallback: check localStorage (set during registration)
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('otw_user_role')
      return storedRole === 'Driver'
    }
    return false
  })()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const next = () => {
    // Check role from token first
    try {
      const token = Cookies.get('otw_token')
      console.log('🔑 Token:', token ? 'exists' : 'missing')
      if (token) {
        const d: any = jwtDecode(token)
        console.log('📋 Token role:', d.role)
        if (d.role === 'Driver') {
          console.log('✅ Going to driver-setup (token)')
          router.push('/auth/driver-setup')
          return
        }
      }
    } catch (e) {
      console.error('Token decode error:', e)
    }

    // Fallback: check localStorage (set during registration)
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('otw_user_role') : null
    console.log('💾 Stored role:', storedRole)
    if (storedRole === 'Driver') {
      console.log('✅ Going to driver-setup (localStorage)')
      router.push('/auth/driver-setup')
      return
    }

    // Default to login (for riders or if role check fails)
    console.log('❌ Going to login (no Driver role detected)')
    toast.success('Registration complete! Please log in to access your dashboard.')
    router.push('/auth/login')
  }

  const submit = async () => {
    if (!file) { next(); return }
    setLoading(true)

    try {
      // 1. Upload to local /public/uploads/
      const url = await uploadToLocal(file)
      if (url) {
        localStorage.setItem('otw_student_id_url', url)
      } else {
        if (preview) localStorage.setItem('otw_student_id_preview', preview)
      }

      // 2. Save to backend so admin can see it in verifications
      try {
        console.log('📤 Uploading student ID to backend...')
        const uploadRes = await userAPI.uploadId(file)
        console.log('✅ Backend upload successful:', uploadRes.data)
      } catch (backendError: any) {
        // Backend save failed, so admin would not be able to review the ID.
        toast.error(backendError.response?.data?.message || 'Could not save ID photo to backend. Please try again.')
        setLoading(false)
        return
        console.error('❌ Backend upload failed:', backendError.response?.data || backendError.message)
      }

      setDone(true)
      setLoading(false)
      setTimeout(next, 700)
    } catch (error) {
      toast.error('Failed to upload ID. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
          {isDriver ? 'Step 3 of 4' : 'Step 3 of 3'}
        </div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <h1 className="page-heading">Upload your student ID</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            {isDriver ? 'Required — next you will upload your car details' : 'Required for account verification'}
          </p>

          {/* Drop zone */}
          <label htmlFor="id-file">
            <div
              className={`upload-box ${file ? 'done' : ''}`}
              style={{ marginBottom: 16, cursor: 'pointer', overflow: 'hidden' }}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}>
              {preview ? (
                <img src={preview} alt="ID preview"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8 }} />
              ) : (
                <>
                  <div style={{ width: 36, height: 36, margin: '0 auto 10px', color: 'var(--green)', display: 'flex' }}>{I.upload}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--green)' }}>
                    Tap to upload student ID photo
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                    JPG, PNG or PDF · Max 5MB
                  </div>
                </>
              )}
            </div>
          </label>
          <input id="id-file" ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFile} />

          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--green-l)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <span style={{ width: 14, height: 14, color: 'var(--green)', display: 'flex', flexShrink: 0 }}>{I.check}</span>
              <span style={{ color: 'var(--text)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ color: 'var(--text3)', flexShrink: 0 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}
                onClick={() => { setFile(null); setPreview('') }}>
                <span style={{ width: 14, height: 14, display: 'flex' }}>{I.x}</span>
              </button>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Requirements</div>
            {['Clear readable photo', 'Must show name and student ID number', 'Valid and not expired', 'JPG, PNG or PDF · Max 5MB'].map(r => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text2)' }}>
                <span style={{ width: 16, height: 16, color: 'var(--green)', flexShrink: 0, display: 'flex' }}>{I.checkC}</span>{r}
              </div>
            ))}
          </div>

          <div className="notice notice-blue" style={{ marginBottom: 20 }}>
            <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.info}</span>
            <span style={{ fontSize: 12 }}>
              Your ID is uploaded to the backend and stored for admin verification.
            </span>
          </div>

          {isDriver ? (
            <div className="notice notice-amber" style={{ marginBottom: 20 }}>
              <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.info}</span>
              <div style={{ fontSize: 12 }}>After uploading your student ID, you will complete your <strong>car and licence details</strong> in the next step.</div>
            </div>
          ) : (
            <div className="notice notice-green" style={{ marginBottom: 20 }}>
              <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{I.check}</span>
              <div style={{ fontSize: 12 }}>As a rider, your account is <strong>already active</strong>. This helps us keep the platform safe.</div>
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading || done} style={{ marginBottom: 10 }}>
            {done ? '✓ Saved!' : loading ? 'Uploading...' : file ? (isDriver ? 'Upload & continue →' : 'Submit & go to dashboard →') : (isDriver ? 'Continue →' : 'Go to dashboard →')}
          </button>
          <button className="btn btn-secondary btn-full" onClick={next} disabled={loading || done}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
