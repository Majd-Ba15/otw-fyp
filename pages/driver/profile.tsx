import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { userAPI, notifAPI } from '../../services/api'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import UniversityBadge from '../../components/shared/UniversityBadge'
import { findUniversity } from '../../lib/universities'

export default function DriverProfile() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats,   setStats]   = useState<any>(null)
  const [car,     setCar]     = useState<any>(null)
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      userAPI.getStats(),
      userAPI.getCar(),
      notifAPI.getUnreadCount(),
    ]).then(([p, s, c, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (s.status === 'fulfilled') setStats(s.value.data)
      if (c.status === 'fulfilled') setCar(c.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const logout = () => { Cookies.remove('otw_token'); router.push('/auth/login') }
  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    try {
      await userAPI.uploadPhoto(f)
      toast.success('Photo updated!')
      userAPI.getMe().then(r => setProfile(r.data))
    } catch { toast.error('Upload failed') }
  }

  // Only real, working destinations — earnings badge is the live computed total
  const menuItems = [
    { icon:I.car,     label:'Vehicle Information',  href:'/driver/vehicle',   badge: car?.model || null },
    { icon:I.dollar,  label:'Earnings',             href:'/driver/earnings',  badge: stats?.earnings != null ? `$${Number(stats.earnings).toFixed(2)}` : null },
  ]

  if (loading && !profile) return (
    <Layout title="Profile" role="Driver" userInitials={initials} unreadCount={unread}>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 13 }}>Loading profile...</div>
    </Layout>
  )

  return (
    <Layout title="Profile" role="Driver" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">

        {/* Hero card */}
        <div className="card" style={{background:'linear-gradient(135deg,var(--blue) 0%,#1e3a8a 100%)',border:'none',padding:'24px 20px',textAlign:'center',marginBottom:12}}>
          <div style={{position:'relative',width:'fit-content',margin:'0 auto 12px'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(255,255,255,0.25)',border:'3px solid rgba(255,255,255,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,color:'white',overflow:'hidden'}}>
              {profile?.profilePhoto
                ? <img src={`${profile.profilePhoto}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : initials}
            </div>
            <button onClick={()=>fileRef.current?.click()} style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:'50%',background:'var(--green)',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <span style={{width:12,height:12,color:'white',display:'flex'}}>{I.camera}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={uploadPhoto}/>
          </div>
          <div style={{fontSize:20,fontWeight:700,color:'white'}}>{profile?.fullName || '—'}</div>
          <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'center',marginTop:6}}>
            <span style={{width:14,height:14,color:'#F59E0B',display:'flex'}}>{I.starF}</span>
            <span style={{fontSize:14,color:'rgba(255,255,255,0.9)'}}>{Number(stats?.averageRating || 0).toFixed(1)} rating</span>
          </div>
          {profile?.faculty && <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:4}}>{profile.faculty}</div>}
          {findUniversity(profile?.university) && findUniversity(profile?.university)!.code !== 'OTHER' && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:2}}>
              {findUniversity(profile?.university)!.name}{profile?.campusName ? ` · ${profile.campusName}` : ''}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:8,flexWrap:'wrap'}}>
            {profile?.isVerified && (
              <span className="badge badge-green" style={{display:'inline-flex'}}>
                <span style={{width:12,height:12,display:'flex'}}>{I.checkC}</span> Verified Driver
              </span>
            )}
            <UniversityBadge code={profile?.university} campusName={profile?.campusName} />
          </div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12}}>
          {[
            {val:stats?.driverCompletedRides ?? 0,                      label:'Rides completed'},
            {val:Number(stats?.averageRating || 0).toFixed(1),          label:'Rating'},
            {val:`$${Number(stats?.earnings || 0).toFixed(0)}`,         label:'Earned'},
          ].map((s,i) => (
            <div key={i} className="stat-card" style={{textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{s.val}</div>
              <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Car shortcut */}
        <div className="card" style={{cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:12}} onClick={()=>router.push('/driver/vehicle')}>
          <span style={{width:18,height:18,color:'var(--text3)',display:'flex'}}>{I.car}</span>
          <span style={{flex:1,fontSize:13,color:'var(--text2)'}}>{car?.model||'No vehicle added'} {car?.plateNumber ? `· ${car.plateNumber}` : ''}</span>
          <span style={{width:14,height:14,color:'var(--text3)',display:'flex',transform:'rotate(180deg)'}}>{I.back}</span>
        </div>

        {/* Contact info */}
        <div className="card" style={{marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:10}}>Contact Information</div>
          {[
            {icon:null,    val:profile?.phone||'—'},
            {icon:I.mail,  val:profile?.email||'—'},
            {icon:I.pin,   val:profile?.faculty||'—'},
            {icon:I.clock, val:`Joined ${profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en',{month:'long',year:'numeric'}) : '—'}`},
          ].map((c,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<3?'1px solid var(--border)':'none',fontSize:13,color:'var(--text2)'}}>
              {c.icon && <span style={{width:15,height:15,color:'var(--text3)',display:'flex'}}>{c.icon}</span>}{c.val}
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12}}>
          {menuItems.map((item,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:i<menuItems.length-1?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>item.href!=='#'&&router.push(item.href)}>
              <span style={{width:16,height:16,color:'var(--text3)',display:'flex'}}>{item.icon}</span>
              <span style={{flex:1,fontSize:13,color:'var(--text)'}}>{item.label}</span>
              {item.badge && <span style={{fontSize:12,color:'var(--text3)',fontWeight:500}}>{item.badge}</span>}
              <span style={{width:14,height:14,color:'var(--text4)',display:'flex',transform:'rotate(180deg)'}}>{I.back}</span>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button className="btn btn-full" style={{border:'1.5px solid var(--red)',color:'var(--red)',background:'transparent',height:46,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:14,borderRadius:8}} onClick={logout}>
          <span style={{width:16,height:16,display:'flex'}}>{I.logout}</span> Log Out
        </button>

      </div>
    </Layout>
  )
}
