import { useState, useEffect, useRef } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { bookingAPI, userAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import UniversityBadge from '../../components/shared/UniversityBadge'
import { findUniversity } from '../../lib/universities'

export default function RiderProfile() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({ phone: '', campusName: '' })
  const [loading, setLoading] = useState(false)
  const [ridesTaken, setRidesTaken] = useState(0)

  useEffect(() => {
    userAPI.getMe().then(r => { setProfile(r.data); setForm({ phone: r.data.phone || '', campusName: r.data.campusName || '' }) }).catch(() => {})
    bookingAPI.getHistory().then(r => {
      const bookings = Array.isArray(r.data) ? r.data : []
      setRidesTaken(bookings.filter((b: any) => b.status === 'Confirmed' || b.status === 'Completed').length)
    }).catch(() => {
      userAPI.getStats().then(r => setRidesTaken(r.data?.ridesTaken || r.data?.completedRides || 0)).catch(() => {})
    })
  }, [])

  const save = async () => {
    setLoading(true)
    try { await userAPI.updateMe(form); toast.success('Saved!'); setEditing(false); userAPI.getMe().then(r => setProfile(r.data)) }
    catch { toast.error('Failed to save') }
    finally { setLoading(false) }
  }

  const logout = () => { Cookies.remove('otw_token'); router.push('/auth/login') }
  const initials = profile?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'
  const isVerified = Boolean(profile?.isVerified || profile?.isEmailVerified)

  const menuItems = [
    { icon: I.sos,    label: 'Emergency contacts',   href: '/rider/emergency' },
    { icon: I.bell,   label: 'Notification settings', href: '/notifications' },
    { icon: I.logout, label: 'Log out',               action: logout, danger: true },
  ]

  return (
    <Layout title="Profile" role="Rider" userInitials={initials}>
      <div className="page-inner" style={{ maxWidth: 640 }}>
        {/* Profile card */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 12px' }}>
            <div className="av av-xl" style={{ border: '3px solid var(--green-l2)' }}>
              {profile?.profilePhoto ? <img src={`${profile.profilePhoto}`} alt="" /> : initials}
            </div>
            <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--green)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span style={{ width: 12, height: 12, color: 'white', display: 'flex' }}>{I.camera}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) { try { const res = await userAPI.uploadPhoto(f); if (res.data?.url) await userAPI.updateMe({ profilePhoto: res.data.url }); toast.success('Photo updated!'); userAPI.getMe().then(r => setProfile(r.data)) } catch { toast.error('Upload failed') } } }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{profile?.fullName}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge badge-green">Rider</span>
            {isVerified && <span className="badge badge-green">Verified</span>}
            <UniversityBadge code={profile?.university} campusName={profile?.campusName} />
          </div>
          {findUniversity(profile?.university) && findUniversity(profile?.university)!.code !== 'OTHER' && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {findUniversity(profile?.university)!.name}{profile?.campusName ? ` · ${profile.campusName}` : ''}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : '—'}</div>
        </div>

        {/* Stats — riders aren't rated, so no stars; only real numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { val: ridesTaken, label: 'Rides taken', icon: I.pin, color: 'var(--green)' },
            { val: isVerified ? 'Verified' : 'Pending', label: 'Account status', icon: I.shield, color: isVerified ? 'var(--green)' : '#F59E0B' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
              <span style={{ width: 20, height: 20, color: s.color, display: 'flex', margin: '0 auto 4px' }}>{s.icon}</span>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{s.val}</div>
              <div className="stat-label" style={{ textAlign: 'center' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Personal info */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Personal Information</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {editing
                ? <><button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save} disabled={loading}>{loading ? '...' : 'Save'}</button></>
                : <button className="btn-icon btn-secondary" onClick={() => setEditing(true)}><span style={{ width: 15, height: 15, display: 'flex' }}>{I.edit}</span></button>}
            </div>
          </div>
          {[
            { icon: I.mail,  label: 'Email',      val: profile?.email,     key: 'email',     editable: false },
            { icon: I.id,    label: 'Student ID',  val: profile?.studentId, key: 'studentId', editable: false },
            { icon: I.id,    label: 'Faculty',     val: profile?.faculty,   key: 'faculty',   editable: false },
            { icon: I.phone, label: 'Phone',       val: profile?.phone,     key: 'phone',     editable: true  },
          ].map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ width: 15, height: 15, color: 'var(--text3)', display: 'flex' }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.label}</div>
                  {editing && f.editable
                    ? <input className="input" style={{ height: 34, marginTop: 2, fontSize: 13 }} value={form[f.key as keyof typeof form] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    : <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 1 }}>{f.val || '—'}</div>}
                </div>
              </div>
              {f.key === 'email' && <button style={{ background: 'none', border: 'none', cursor: 'pointer', width: 16, height: 16, display: 'flex', color: 'var(--green)' }}>{I.checkC}</button>}
            </div>
          ))}
          {findUniversity(profile?.university) && findUniversity(profile?.university)!.campuses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ width: 15, height: 15, color: 'var(--text3)', display: 'flex' }}>{I.pin}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Home campus</div>
                  {editing
                    ? <select className="input" style={{ height: 34, marginTop: 2, fontSize: 13 }} value={form.campusName} onChange={e => setForm(p => ({ ...p, campusName: e.target.value }))}>
                        <option value="">Not set</option>
                        {findUniversity(profile.university)!.campuses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    : <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 1 }}>{profile?.campusName || '—'}</div>}
                </div>
              </div>
            </div>
          )}
          {editing && <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={save} disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button>}
        </div>

        {/* Menu items */}
        <div className="card" style={{ marginTop: 12 }}>
          {menuItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
              onClick={() => item.action ? item.action() : item.href !== '#' && router.push(item.href)}>
              <span style={{ width: 16, height: 16, display: 'flex', color: item.danger ? 'var(--red)' : 'var(--text3)' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14, color: item.danger ? 'var(--red)' : 'var(--text)' }}>{item.label}</span>
              {!item.danger && <span style={{ width: 14, height: 14, display: 'flex', color: 'var(--text3)' }}>{I.back}</span>}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
