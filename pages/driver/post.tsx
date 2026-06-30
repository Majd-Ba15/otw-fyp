import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Layout, { I } from '../../components/layout/Layout'
import { rideAPI, userAPI } from '../../services/api'
import toast from 'react-hot-toast'
const MapPicker = dynamic(()=>import('../../components/shared/MapPicker'),{ssr:false})

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function PostRide() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState<'price' | 'description' | null>(null)
  const [priceReason, setPriceReason] = useState('')
  const [showMapFrom, setShowMapFrom] = useState(false)
  const [showMapTo,   setShowMapTo]   = useState(false)
  const [form, setForm] = useState({
    from:'', to:'', fromLat:0, fromLng:0, toLat:0, toLng:0,
    departureTime:'', recurring:false, recurringDays:[] as string[],
    seats:3, price:4, genderPref:'Any', notes:'',
  })
  useEffect(()=>{ userAPI.getMe().then(r=>setProfile(r.data)).catch(()=>{}) },[])
  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()||'SM'
  const toggleDay = (d:string) => setForm(p=>({...p,recurringDays:p.recurringDays.includes(d)?p.recurringDays.filter(x=>x!==d):[...p.recurringDays,d]}))

  const runDriverAi = async (mode: 'price' | 'description') => {
    if (!form.from || !form.to) { toast.error('Add pickup and drop-off first'); return }
    setAiLoading(mode)
    try {
      const res = await fetch('/api/ai/driver-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mode }),
      })
      const data = await res.json()
      if (mode === 'price' && data.price) {
        setForm(p => ({ ...p, price: Number(data.price) }))
        setPriceReason(data.priceReason || '')
        toast.success('AI price suggested')
      }
      if (mode === 'description' && data.description) {
        setForm(p => ({ ...p, notes: data.description }))
        toast.success('AI note generated')
      }
    } catch {
      toast.error('AI suggestion failed')
    } finally {
      setAiLoading(null)
    }
  }

  const submit = async ()=>{
    if(!form.from||!form.to||!form.departureTime){toast.error('Please fill all required fields');return}
    setLoading(true)
    try{
      await rideAPI.post({fromLocation:form.from,toLocation:form.to,fromLat:form.fromLat||null,fromLng:form.fromLng||null,toLat:form.toLat||null,toLng:form.toLng||null,departureTime:new Date(form.departureTime).toISOString(),totalSeats:form.seats,pricePerSeat:form.price,genderPreference:form.genderPref,notes:form.notes,isRecurring:form.recurring,recurringDays:form.recurringDays.join(',')})
      toast.success('Ride posted!'); router.push('/driver/rides')
    }catch(e:any){toast.error(e.response?.data?.message||'Failed to post ride')}
    finally{setLoading(false)}
  }

  return (
    <Layout role="Driver" showBack userInitials={initials}>
      <div className="page-inner" style={{maxWidth:560}}>
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:16}}>Post a ride</h1>

        {/* Route */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Route details</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Pickup point *</div>
            <div style={{display:'flex',gap:8}}>
              <input className="input" style={{flex:1}} placeholder="e.g. Main Campus Gate" value={form.from} onChange={e=>setForm(p=>({...p,from:e.target.value}))}/>
              <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}} onClick={()=>setShowMapFrom(o=>!o)}>
                <span style={{width:13,height:13,display:'flex'}}>{I.pin}</span> Pick
              </button>
            </div>
            {showMapFrom && <div style={{marginTop:8}}><MapPicker label="" onPick={(lat,lng,name)=>{setForm(p=>({...p,fromLat:lat,fromLng:lng,from:name}));setShowMapFrom(false)}} height={160}/></div>}
          </div>
          <div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Drop-off point *</div>
            <div style={{display:'flex',gap:8}}>
              <input className="input" style={{flex:1}} placeholder="e.g. City Centre" value={form.to} onChange={e=>setForm(p=>({...p,to:e.target.value}))}/>
              <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}} onClick={()=>setShowMapTo(o=>!o)}>
                <span style={{width:13,height:13,display:'flex'}}>{I.pin}</span> Pick
              </button>
            </div>
            {showMapTo && <div style={{marginTop:8}}><MapPicker label="" onPick={(lat,lng,name)=>{setForm(p=>({...p,toLat:lat,toLng:lng,to:name}));setShowMapTo(false)}} height={160}/></div>}
          </div>
        </div>

        {/* Schedule */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Schedule</div>
          <input className="input" type="datetime-local" style={{marginBottom:10}} value={form.departureTime} onChange={e=>setForm(p=>({...p,departureTime:e.target.value}))}/>
          <label className="check-label" style={{marginBottom:form.recurring?10:0}}>
            <input type="checkbox" checked={form.recurring} onChange={e=>setForm(p=>({...p,recurring:e.target.checked}))}/>
            Recurring ride
          </label>
          {form.recurring && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
              {DAYS.map(d=>(
                <button key={d} className={`chip ${form.recurringDays.includes(d)?'active':''}`} onClick={()=>toggleDay(d)}>{d}</button>
              ))}
            </div>
          )}
        </div>

        {/* Seats & price */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:12}}>Seats & price</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Seats</div>
              <input className="input" type="number" min={1} max={8} value={form.seats} onChange={e=>setForm(p=>({...p,seats:parseInt(e.target.value)}))}/>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <div style={{fontSize:12,color:'var(--text3)'}}>Price ($)</div>
                <button className="btn btn-secondary btn-sm" style={{fontSize:11,padding:'4px 7px'}} onClick={()=>runDriverAi('price')} disabled={aiLoading==='price'}>
                  {aiLoading==='price'?'Thinking...':'AI price'}
                </button>
              </div>
              <input className="input" type="number" min={1} value={form.price} onChange={e=>setForm(p=>({...p,price:parseFloat(e.target.value)}))}/>
            </div>
          </div>
          {priceReason && (
            <div style={{fontSize:12,color:'var(--blue)',background:'var(--blue-l)',borderRadius:8,padding:'8px 10px',marginBottom:12}}>
              {priceReason}
            </div>
          )}
          <div style={{display:'flex',gap:8}}>
            {['Any','Female','Male'].map(g=>(
              <button key={g} className={`chip ${form.genderPref===g?'active':''}`} onClick={()=>setForm(p=>({...p,genderPref:g}))}>{g}</button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card" style={{marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>Notes for riders</div>
            <button className="btn btn-secondary btn-sm" onClick={()=>runDriverAi('description')} disabled={aiLoading==='description'}>
              {aiLoading==='description'?'Writing...':'AI note'}
            </button>
          </div>
          <textarea className="input" rows={3} placeholder="e.g. No smoking. Music on." value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
        </div>

        <button className="btn btn-blue btn-full btn-lg" onClick={submit} disabled={loading}>
          {loading?'Posting..':'+ Post ride'}
        </button>
      </div>
    </Layout>
  )
}
