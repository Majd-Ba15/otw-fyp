import { useState, useEffect, useRef } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function Vehicle() {
  const [profile,  setProfile]  = useState<any>(null)
  const [car,      setCar]      = useState<any>(null)
  const [editing,  setEditing]  = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving,   setSaving]   = useState(false)
  const [unread,   setUnread]   = useState(0)
  const [loading,  setLoading]  = useState(true)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      notifAPI.getUnreadCount(),
    ]).then(([p, n]) => {
      if (p.status === 'fulfilled') {
        setProfile(p.value.data)
        const c = p.value.data?.car
        setCar(c)
        setEditForm({ model:c?.model||'', plateNumber:c?.plateNumber||'', colour:c?.colour||'', year:c?.year||'2020', totalSeats:c?.totalSeats||4 })
      }
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const saveEdits = async () => {
    setSaving(true)
    try {
      await userAPI.saveCar(editForm)
      toast.success('Vehicle updated!')
      setEditing(false)
      userAPI.getMe().then(r => { setProfile(r.data); setCar(r.data?.car) })
    } catch (e:any) { toast.error(e.response?.data?.message || 'Failed to update') }
    finally { setSaving(false) }
  }

  const uploadCarPhoto = async (e: React.ChangeEvent<HTMLInputElement>, type:string) => {
    const f = e.target.files?.[0]; if (!f) return
    try { await userAPI.uploadCarPhoto(f, type); toast.success('Photo uploaded!') }
    catch { toast.error('Upload failed') }
  }

  const docs = [
    { name:'Road Tax',        status: car?.roadTaxExpiry ? 'ok'      : 'missing', expires: car?.roadTaxExpiry  ? `Expires: ${new Date(car.roadTaxExpiry).toLocaleDateString('en',{month:'short',year:'numeric'})}` : 'Not uploaded' },
    { name:'Insurance',       status: car?.insuranceExpiry ? 'ok'    : 'missing', expires: car?.insuranceExpiry? `Expires: ${new Date(car.insuranceExpiry).toLocaleDateString('en',{month:'short',year:'numeric'})}` : 'Not uploaded' },
    { name:'Puspakom Report', status: car?.puspakomUploaded ? 'ok'   : 'missing', expires: car?.puspakomUploaded ? 'Uploaded' : 'Not uploaded' },
  ]

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout title="Vehicle" role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>Vehicle Information</h1>
            <p style={{fontSize:13,color:'var(--text3)',marginTop:2}}>Manage your vehicle details</p>
          </div>
          {!editing && (
            <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:5}} onClick={()=>setEditing(true)}>
              <span style={{width:13,height:13,display:'flex'}}>{I.edit}</span> Edit
            </button>
          )}
        </div>

        {/* Photo */}
        <div className="card" style={{textAlign:'center',padding:'28px 20px',marginBottom:12,cursor:'pointer'}} onClick={()=>photoRef.current?.click()}>
          {car?.photoFront ? (
            <img src={`http://localhost:5000${car.photoFront}`} alt="car" style={{width:'100%',maxHeight:160,objectFit:'cover',borderRadius:8}}/>
          ) : (
            <>
              <div style={{width:80,height:80,borderRadius:12,background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                <span style={{width:36,height:36,color:'var(--text4)',display:'flex',opacity:.6}}>{I.car}</span>
              </div>
              <div style={{fontSize:13,color:'var(--text3)'}}>Add a photo of your vehicle</div>
            </>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadCarPhoto(e,'front')}/>
        </div>

        {/* Vehicle details */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:14}}>Vehicle Details</div>
          {[
            {label:'Car Model',       key:'model',       val:car?.model},
            {label:'Plate Number',    key:'plateNumber', val:car?.plateNumber},
            {label:'Color',           key:'colour',      val:car?.colour},
            {label:'Year',            key:'year',        val:car?.year||'2020'},
            {label:'Available Seats', key:'totalSeats',  val:car?.totalSeats ? `${car.totalSeats} seats` : '4 seats'},
          ].map((f,i,arr) => (
            <div key={f.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none'}}>
              <span style={{fontSize:13,color:'var(--text3)'}}>{f.label}</span>
              {editing
                ? <input className="input" style={{width:180,height:34,fontSize:13}} value={editForm[f.key]||''} onChange={e=>setEditForm((p:any)=>({...p,[f.key]:e.target.value}))}/>
                : <span style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{f.val||'—'}</span>
              }
            </div>
          ))}
          {editing && (
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button className="btn btn-secondary btn-sm" style={{flex:1}} onClick={()=>setEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" style={{flex:1}} onClick={saveEdits} disabled={saving}>{saving?'Saving...':'Save changes'}</button>
            </div>
          )}
        </div>

        {/* Documents */}
        <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:10}}>Vehicle Documents</div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {docs.map((d,i) => (
            <div key={d.name} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<docs.length-1?'1px solid var(--border)':'none',background:d.status==='missing'?'#FFF7ED':'transparent'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:d.status==='ok'?'var(--green-l)':'var(--red-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{width:14,height:14,color:d.status==='ok'?'var(--green)':'var(--red)',display:'flex'}}>{d.status==='ok'?I.check:I.x}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{d.name}</div>
                <div style={{fontSize:12,color:d.status==='missing'?'var(--red)':'var(--text3)',marginTop:1}}>{d.expires}</div>
              </div>
              {d.status==='ok'
                ? <button style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--blue)',fontWeight:500}}>View</button>
                : <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{width:12,height:12,display:'flex'}}>{I.plus}</span> Upload
                  </button>
              }
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
