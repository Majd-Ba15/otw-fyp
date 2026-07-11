import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { I as Icons } from '../../components/layout/Layout'
import Cookies from 'js-cookie'
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
  } catch { return null }
}

export default function DriverSetup() {
  const router   = useRouter()
  const licRef   = useRef<HTMLInputElement>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const sideRef  = useRef<HTMLInputElement>(null)

  const [loading,   setLoading]   = useState(false)
  const [licFile,   setLicFile]   = useState<File | null>(null)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [sideFile,  setSideFile]  = useState<File | null>(null)
  const [licPrev,   setLicPrev]   = useState('')
  const [car, setCar] = useState({ model: '', colour: '', plateNumber: '', totalSeats: 4 })

  const pickFile = (
    setter: (f: File) => void,
    prevSetter: (s: string) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setter(f)
    const reader = new FileReader()
    reader.onload = ev => prevSetter(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handle = async () => {
    if (!car.model || !car.plateNumber) {
      toast.error('Car model and plate number are required')
      return
    }
    setLoading(true)

    // 1. Save car data locally
    localStorage.setItem('otw_car_setup', JSON.stringify(car))

    // 2. Upload licence and car photos to local /public/uploads/
    const uploads: Record<string, string | null> = {}
    if (licFile)   uploads.licence = await uploadToLocal(licFile,   '?type=licence')
    if (frontFile) uploads.front   = await uploadToLocal(frontFile, '?type=front')
    if (sideFile)  uploads.side    = await uploadToLocal(sideFile,  '?type=side')
    if (Object.keys(uploads).length) {
      localStorage.setItem('otw_car_uploads', JSON.stringify(uploads))
    }

    // 3. Save car data and submit verification to backend.
    try {
      await userAPI.saveCar(car)
      await userAPI.submitVerification()
      console.log('Verification submitted - driver will appear in admin panel')
    } catch (e: any) {
      console.error('Verification submission failed:', e)
      toast.error(e.response?.data?.message || 'Could not submit verification. Please log in and try again.')
      setLoading(false)
      return
    }

    toast.success('Driver profile submitted! Awaiting admin approval.')
    setLoading(false)
    router.push('/driver/pending')
  }

  const steps = ['Account', 'Profile', 'Student ID', 'Car & Licence']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ height: 56, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ width: 32, height: 32, background: 'white', borderRadius: 8, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>Step 4 of 4</div>
      </header>

      <div style={{ padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow)' }}>

          {/* Step dots */}
          <div className="steps" style={{ marginBottom: 24 }}>
            {steps.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                <div className={`step-dot ${i < 3 ? 'done' : 'active'}`} title={label}>
                  {i < 3
                    ? <span style={{ width: 13, height: 13, display: 'flex' }}>{Icons.check}</span>
                    : 4}
                </div>
                {i < steps.length - 1 && (
                  <div className="step-line done" style={{ flex: 1, margin: '0 4px' }} />
                )}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Car & Licence details</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Your account will be reviewed by admin before you can post rides.
          </p>

          {/* Driving licence upload */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.upload}</span>
              Driving licence *
            </label>
            <div
              onClick={() => licRef.current?.click()}
              style={{
                border: `1.5px dashed ${licFile ? 'var(--blue)' : 'var(--border2)'}`,
                borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer',
                background: licFile ? 'var(--blue-l)' : 'var(--bg)',
                transition: 'all .2s', overflow: 'hidden',
              }}>
              {licPrev ? (
                <img src={licPrev} alt="licence" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
              ) : (
                <>
                  <div style={{ width: 32, height: 32, margin: '0 auto 8px', color: 'var(--blue)', display: 'flex' }}>{Icons.upload}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Upload driving licence</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Front side · JPG, PDF · Max 5MB</div>
                </>
              )}
              <input ref={licRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={pickFile(f => setLicFile(f), setLicPrev)} />
            </div>
            {licFile && (
              <div style={{ fontSize: 12, color: 'var(--blue)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, display: 'flex' }}>{Icons.check}</span>
                {licFile.name}
              </div>
            )}
          </div>

          {/* Car model + colour */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                <span style={{ width: 16, height: 16, display: 'flex' }}>{Icons.car}</span>Car model *
              </label>
              <input className="input" placeholder="e.g. Proton Myvi"
                value={car.model} onChange={e => setCar(p => ({ ...p, model: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Colour *</label>
              <input className="input" placeholder="e.g. White"
                value={car.colour} onChange={e => setCar(p => ({ ...p, colour: e.target.value }))} />
            </div>
          </div>

          {/* Plate + seats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Plate number *</label>
              <input className="input" placeholder="e.g. WXX 1234"
                value={car.plateNumber} onChange={e => setCar(p => ({ ...p, plateNumber: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Available seats</label>
              <select className="input" value={car.totalSeats} onChange={e => setCar(p => ({ ...p, totalSeats: parseInt(e.target.value) }))}>
                {[2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} seats</option>)}
              </select>
            </div>
          </div>

          {/* Car photos */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: 10 }}>Car photos (optional)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Front of car', ref: frontRef, file: frontFile, set: setFrontFile },
                { label: 'Side of car',  ref: sideRef,  file: sideFile,  set: setSideFile  },
              ].map(({ label, ref, file, set }) => (
                <div key={label} onClick={() => ref.current?.click()}
                  style={{ height: 76, border: `1.5px dashed ${file ? 'var(--green)' : 'var(--border2)'}`, borderRadius: 8, background: file ? 'var(--green-l)' : 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 5, transition: 'all .2s' }}>
                  <span style={{ width: 22, height: 22, color: file ? 'var(--green)' : 'var(--text3)', display: 'flex' }}>{Icons.camera}</span>
                  <span style={{ fontSize: 12, color: file ? 'var(--green)' : 'var(--text3)' }}>{file ? '✓ Added' : label}</span>
                  <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) set(f) }} />
                </div>
              ))}
            </div>
          </div>

          <div className="notice notice-blue" style={{ marginBottom: 20 }}>
            <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}>{Icons.info}</span>
            <span style={{ fontSize: 12 }}>
              Your car details are saved. You cannot post rides until admin reviews and approves your profile.
            </span>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handle}
            disabled={loading || !car.model || !car.plateNumber}>
            {loading ? 'Submitting...' : 'Complete setup & submit for review'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text3)' }}>
            Admin review usually takes up to 24 hours
          </div>
        </div>
      </div>
    </div>
  )
}
