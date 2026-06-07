import { useState, useEffect } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const EMPTY_FORM = { from:'', to:'', time:'08:00', days:[] as string[], price: '4', seats: '3' }

export default function RecurringRides() {
  const [profile,   setProfile]   = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [unread,    setUnread]    = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form,      setForm]      = useState({ ...EMPTY_FORM })
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      rideAPI.getMine('recurring'),
      notifAPI.getUnreadCount(),
    ]).then(([p, r, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      setSchedules(r.status === 'fulfilled' ? (r.value.data || []) : [])
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const openNew = () => {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, days: [] })
    setShowModal(true)
  }

  const openEdit = (s: any) => {
    setEditTarget(s)
    setForm({
      from:  s.fromLocation || '',
      to:    s.toLocation   || '',
      time:  s.time         || '08:00',
      days:  s.recurringDays || s.days || [],
      price: String(s.pricePerSeat || 4),
      seats: String(s.totalSeats   || 3),
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditTarget(null) }

  const toggleDay = (d: string) =>
    setForm(p => ({ ...p, days: p.days.includes(d) ? p.days.filter(x => x !== d) : [...p.days, d] }))

  const save = async () => {
    if (!form.from.trim() || !form.to.trim()) { toast.error('Please enter from and to locations'); return }
    if (form.days.length === 0) { toast.error('Select at least one day'); return }
    setSaving(true)
    try {
      if (editTarget) {
        await rideAPI.update(editTarget.id, {
          fromLocation:  form.from,
          toLocation:    form.to,
          time:          form.time,
          recurringDays: form.days,
          pricePerSeat:  parseFloat(form.price) || 4,
          totalSeats:    parseInt(form.seats)   || 3,
        })
        setSchedules(p => p.map(s => s.id === editTarget.id
          ? { ...s, fromLocation:form.from, toLocation:form.to, time:form.time, recurringDays:form.days, pricePerSeat:parseFloat(form.price)||4, totalSeats:parseInt(form.seats)||3 }
          : s
        ))
        toast.success('Schedule updated!')
      } else {
        const departureDate = new Date()
        const [hh, mm] = form.time.split(':')
        departureDate.setHours(parseInt(hh), parseInt(mm), 0, 0)
        const res = await rideAPI.post({
          fromLocation:  form.from,
          toLocation:    form.to,
          departureTime: departureDate.toISOString(),
          totalSeats:    parseInt(form.seats) || 3,
          pricePerSeat:  parseFloat(form.price) || 4,
          isRecurring:   true,
          recurringDays: form.days.join(','),
        })
        const newId = res?.data?.rideId || res?.data?.id || Date.now()
        setSchedules(p => [...p, {
          id: newId,
          fromLocation:  form.from,
          toLocation:    form.to,
          time:          form.time,
          recurringDays: form.days,
          pricePerSeat:  parseFloat(form.price) || 4,
          totalSeats:    parseInt(form.seats) || 3,
          status:        'Active',
        }])
        toast.success('Schedule created!')
      }
      closeModal()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (id: number, current: string) => {
    const next = current === 'Active' ? 'Paused' : 'Active'
    try { await rideAPI.update(id, { status: next }) } catch {}
    setSchedules(p => p.map(s => s.id === id ? { ...s, status: next } : s))
    toast.success(`Schedule ${next === 'Active' ? 'resumed' : 'paused'}`)
  }

  const deleteSchedule = async (id: number) => {
    try { await rideAPI.cancel(id) } catch {}
    setSchedules(p => p.filter(s => s.id !== id))
    toast.success('Schedule deleted')
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Recurring rides</h1>
          <button className="btn btn-blue btn-sm" style={{display:'flex',alignItems:'center',gap:5}} onClick={openNew}>
            <span style={{width:13,height:13,display:'flex'}}>{I.plus}</span> New schedule
          </button>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : schedules.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'40px'}}>
            <span style={{width:36,height:36,display:'flex',margin:'0 auto 10px',color:'var(--text4)',opacity:.4}}>{I.repeat}</span>
            <div style={{fontSize:14,color:'var(--text3)',marginBottom:14}}>No recurring schedules yet</div>
            <button className="btn btn-blue btn-sm" onClick={openNew}>Create your first schedule</button>
          </div>
        ) : schedules.map(s => (
          <div key={s.id} className="card" style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:14,height:14,color:'var(--blue)',display:'flex'}}>{I.repeat}</span>
                <span style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{width:12,height:12,color:'var(--text3)',display:'flex'}}>{I.pin}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{s.fromLocation} — {s.toLocation}</span>
                </span>
              </div>
              <span className={`badge ${s.status==='Active'?'badge-green':'badge-amber'}`}>{s.status}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'var(--text3)',marginBottom:10}}>
              <span style={{width:12,height:12,display:'flex'}}>{I.clock}</span>{s.time}
              {s.pricePerSeat && <><span style={{margin:'0 4px'}}>·</span><span style={{color:'var(--green)',fontWeight:600}}>${s.pricePerSeat}/seat</span></>}
            </div>
            {/* Day pills */}
            <div style={{display:'flex',gap:5,marginBottom:12}}>
              {DAYS.map(d => (
                <span key={d} style={{padding:'3px 8px',borderRadius:20,fontSize:11,fontWeight:500,
                  background:(s.recurringDays||s.days||[]).includes(d)?'var(--blue-l)':'var(--bg2)',
                  color:(s.recurringDays||s.days||[]).includes(d)?'var(--blue)':'var(--text3)',
                  border:`1px solid ${(s.recurringDays||s.days||[]).includes(d)?'var(--blue)':'transparent'}`}}>{d}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              {s.status === 'Active'
                ? <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:4}} onClick={()=>toggleStatus(s.id,'Active')}>
                    <span style={{width:12,height:12,display:'flex'}}>{I.pause}</span>Pause
                  </button>
                : <button className="btn btn-primary btn-sm" style={{display:'flex',alignItems:'center',gap:4}} onClick={()=>toggleStatus(s.id,'Paused')}>
                    <span style={{width:12,height:12,display:'flex'}}>{I.play}</span>Resume
                  </button>
              }
              <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:4}} onClick={()=>openEdit(s)}>
                <span style={{width:12,height:12,display:'flex'}}>{I.edit}</span>Edit
              </button>
              <button className="btn btn-danger-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:4}} onClick={()=>deleteSchedule(s.id)}>
                <span style={{width:12,height:12,display:'flex'}}>{I.trash}</span>Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New / Edit modal */}
      {showModal && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{background:'var(--bg-card)',borderRadius:'16px 16px 0 0',padding:24,width:'100%',maxWidth:600,boxShadow:'0 -4px 24px rgba(0,0,0,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{editTarget ? 'Edit schedule' : 'New recurring schedule'}</div>
              <button style={{background:'none',border:'none',cursor:'pointer',padding:4}} onClick={closeModal}>
                <span style={{width:18,height:18,color:'var(--text3)',display:'flex'}}>{I.x}</span>
              </button>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:500}}>From *</div>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:14,height:14,color:'var(--green)',display:'flex'}}>{I.pin}</span>
                <input className="input" style={{paddingLeft:32}} placeholder="Pickup location" value={form.from}
                  onChange={e => setForm(p => ({...p, from: e.target.value}))} />
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:500}}>To *</div>
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:14,height:14,color:'#EF4444',display:'flex'}}>{I.pin}</span>
                <input className="input" style={{paddingLeft:32}} placeholder="Drop-off location" value={form.to}
                  onChange={e => setForm(p => ({...p, to: e.target.value}))} />
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
              <div>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:500}}>Departure *</div>
                <input type="time" className="input" value={form.time}
                  onChange={e => setForm(p => ({...p, time: e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:500}}>Price ($)</div>
                <input type="number" min="1" className="input" value={form.price}
                  onChange={e => setForm(p => ({...p, price: e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:4,fontWeight:500}}>Seats</div>
                <input type="number" min="1" max="8" className="input" value={form.seats}
                  onChange={e => setForm(p => ({...p, seats: e.target.value}))} />
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:8,fontWeight:500}}>Repeat on *</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
                      background: form.days.includes(d) ? 'var(--blue)' : 'var(--bg2)',
                      color:      form.days.includes(d) ? 'white'       : 'var(--text3)',
                      border:     `1px solid ${form.days.includes(d) ? 'var(--blue)' : 'var(--border)'}`}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-secondary" style={{flex:1}} onClick={closeModal}>Cancel</button>
              <button className="btn btn-blue" style={{flex:2}} onClick={save} disabled={saving}>
                {saving ? 'Saving...' : editTarget ? 'Save changes' : 'Create schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
