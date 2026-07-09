import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout, { I } from '../../components/layout/Layout'
import { adminAPI, userAPI, notifAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [users,   setUsers]   = useState<any[]>([])
  const [stats,   setStats]   = useState({ total:0, drivers:0, riders:0, banned:0 })
  const [search,  setSearch]  = useState('')
  const [tab,     setTab]     = useState('All')
  const [loading, setLoading] = useState(true)
  const [unread,  setUnread]  = useState(0)

  // Modals
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editModal, setEditModal] = useState(false)
  const [banModal, setBanModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    fullName: '', email: '', studentId: '', faculty: '', phone: '', gender: '',
    role: '', university: '', campusName: '', isActive: true, isVerified: false, isEmailVerified: false,
  })
  const [banReason, setBanReason] = useState('')

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      adminAPI.getUsers(),
      notifAPI.getUnreadCount(),
    ]).then(([p, u, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      const data = u.status === 'fulfilled' ? (u.value.data || []) : []
      setUsers(data)
      setStats({ total:data.length, drivers:data.filter((x:any)=>x.role==='Driver').length, riders:data.filter((x:any)=>x.role==='Rider').length, banned:data.filter((x:any)=>x.isActive === false).length })
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
      setLoading(false)
    })
  }, [])

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'AD'
  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    if (q && !u.fullName?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    if (tab === 'Drivers' && u.role !== 'Driver') return false
    if (tab === 'Riders'  && u.role !== 'Rider')  return false
    if (tab === 'Banned'  && u.isActive !== false) return false
    return true
  })
  const getInitials = (name:string) => name?.split(' ').map((n:string)=>n[0]).join('').slice(0,1).toUpperCase() || '?'
  const avatarColor = (role:string) => role==='Driver'?{bg:'#EFF6FF',color:'#3B82F6'}:role==='Admin'?{bg:'var(--amber-l)',color:'var(--amber)'}:{bg:'var(--green-l)',color:'var(--green-dd)'}

  // Action handlers
  const openEditModal = (user: any) => {
    setSelectedUser(user)
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      studentId: user.studentId || '',
      faculty: user.faculty || '',
      phone: user.phone || '',
      gender: user.gender || '',
      role: user.role || 'Rider',
      university: user.university || '',
      campusName: user.campusName || '',
      isActive: user.isActive !== false,
      isVerified: !!user.isVerified,
      isEmailVerified: !!user.isEmailVerified,
    })
    setEditModal(true)
    setActionMenu(null)
  }

  const openBanModal = (user: any) => {
    setSelectedUser(user)
    setBanReason('')
    setBanModal(true)
    setActionMenu(null)
  }

  const openDeleteModal = (user: any) => {
    setSelectedUser(user)
    setDeleteModal(true)
    setActionMenu(null)
  }

  const handleSaveEdit = async () => {
    if (!editForm.fullName.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      await adminAPI.updateUser(selectedUser.userId, editForm)

      // Update local state
      setUsers(users.map(u => u.userId === selectedUser.userId ? { ...u, ...editForm } : u))

      toast.success('User updated!')
      setEditModal(false)
    } catch (error) {
      toast.error('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handleBanUser = async () => {
    setSaving(true)
    try {
      await adminAPI.ban(selectedUser.userId)

      // Update local state
      setUsers(users.filter(u => u.userId !== selectedUser.userId))
      setStats({ ...stats, total: stats.total - 1, banned: stats.banned + 1 })

      toast.success('User banned!')
      setBanModal(false)
    } catch (error) {
      toast.error('Failed to ban user')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    setSaving(true)
    try {
      await adminAPI.ban(selectedUser.userId)

      // Update local state
      setUsers(users.filter(u => u.userId !== selectedUser.userId))
      setStats({ ...stats, total: stats.total - 1, [selectedUser.role === 'Driver' ? 'drivers' : 'riders']: selectedUser.role === 'Driver' ? stats.drivers - 1 : stats.riders - 1 })

      toast.success('User deleted!')
      setDeleteModal(false)
    } catch (error) {
      toast.error('Failed to delete user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout role="Admin" userInitials={initials} unreadCount={unread}>
      <div className="page-inner">
        <h1 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:2}}>User Management</h1>
        <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Manage all platform users</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
          {[{val:stats.total,label:'Total',color:'var(--text)'},{val:stats.drivers,label:'Drivers',color:'var(--green)'},{val:stats.riders,label:'Riders',color:'var(--blue)'},{val:stats.banned,label:'Banned',color:'var(--red)'}].map((s,i)=>(
            <div key={i} className="stat-card" style={{textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:700,color:s.color}}>{s.val}</div>
              <div className="stat-label" style={{textAlign:'center'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,marginBottom:12}}>
          <div style={{position:'relative',flex:1}}>
            <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:15,height:15,color:'var(--text3)',display:'flex'}}>{I.search}</span>
            <input className="input" style={{paddingLeft:34}} placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-secondary btn-sm" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:13,height:13,display:'flex'}}>{I.settings}</span> Filter
          </button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {['Drivers','Riders','Banned'].map(t=>(
            <button key={t} className={`chip ${tab===t?'active':''}`} onClick={()=>setTab(p=>p===t?'All':t)}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--text3)',fontSize:13}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:'48px'}}>
            <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:4}}>
              {users.length === 0 ? 'No users found' : 'No matching users'}
            </div>
            <div style={{fontSize:13,color:'var(--text3)'}}>
              {users.length === 0 ? 'Registered users will appear here' : 'Try a different search or filter'}
            </div>
          </div>
        ) : (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            {filtered.map((u,i)=>{
              const av = avatarColor(u.role)
              return (
                <div key={u.userId} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<filtered.length-1?'1px solid var(--border)':'none',cursor:'pointer'}} onClick={()=>router.push(`/admin/users/${u.userId}`)}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:av.bg,color:av.color,fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{getInitials(u.fullName)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{u.fullName}</span>
                      <span style={{width:14,height:14,color:'var(--text4)',display:'flex'}}>{I.checkC}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text3)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                    <div style={{display:'flex',gap:5,marginTop:4}}>
                      <span className={`badge ${u.role==='Driver'?'badge-blue':u.role==='Admin'?'badge-amber':'badge-gray'}`}>{u.role}</span>
                      <span className="badge badge-green">{u.status}</span>
                      {u.isVerified && <span className="badge badge-green">Verified</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                    <div style={{position:'relative'}}>
                      <button onClick={(e)=>{e.stopPropagation(); setActionMenu(actionMenu === u.userId ? null : u.userId)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',width:16,height:16,display:'flex'}}>{I.more}</button>
                      {actionMenu === u.userId && (
                        <div style={{position:'absolute',right:0,top:'100%',background:'white',border:'1px solid var(--border)',borderRadius:'6px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)',zIndex:10,minWidth:'140px',marginTop:4}}>
                          <button onClick={(e)=>{e.stopPropagation(); openEditModal(u)}} style={{width:'100%',padding:'10px 12px',textAlign:'left',fontSize:13,border:'none',background:'none',cursor:'pointer',color:'var(--text)',borderBottom:'1px solid var(--border)'}}>✏️ Edit</button>
                          <button onClick={(e)=>{e.stopPropagation(); openBanModal(u)}} style={{width:'100%',padding:'10px 12px',textAlign:'left',fontSize:13,border:'none',background:'none',cursor:'pointer',color:'var(--red)',borderBottom:'1px solid var(--border)'}}>🚫 Ban</button>
                          <button onClick={(e)=>{e.stopPropagation(); openDeleteModal(u)}} style={{width:'100%',padding:'10px 12px',textAlign:'left',fontSize:13,border:'none',background:'none',cursor:'pointer',color:'var(--red)'}}>🗑️ Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* EDIT MODAL */}
      {editModal && selectedUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setEditModal(false)}>
          <div className="card" style={{width:'90%',maxWidth:560,maxHeight:'85vh',overflow:'auto'}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700}}>Edit User</h2>
              <button onClick={()=>setEditModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>x</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {[
                ['Full Name','fullName'], ['Email','email'], ['Student ID','studentId'], ['Faculty','faculty'],
                ['Phone','phone'], ['Gender','gender'], ['University','university'], ['Campus','campusName'],
              ].map(([label,key]) => (
                <div key={key}>
                  <label style={{fontSize:12,color:'var(--text3)',marginBottom:4,display:'block'}}>{label}</label>
                  <input className="input" value={(editForm as any)[key]} onChange={(e)=>setEditForm({...editForm, [key]: e.target.value})} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,color:'var(--text3)',marginBottom:4,display:'block'}}>Role</label>
                <select className="input" value={editForm.role} onChange={(e)=>setEditForm({...editForm, role: e.target.value})} style={{cursor:'pointer'}}>
                  <option value="Rider">Rider</option>
                  <option value="Driver">Driver</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
              {[
                ['Active','isActive'], ['ID verified','isVerified'], ['Email verified','isEmailVerified'],
              ].map(([label,key]) => (
                <label key={key} className="check-label" style={{margin:0}}>
                  <input type="checkbox" checked={!!(editForm as any)[key]} onChange={(e)=>setEditForm({...editForm, [key]: e.target.checked})}/>
                  {label}
                </label>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {/* BAN MODAL */}
      {banModal && selectedUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setBanModal(false)}>
          <div className="card" style={{width:'90%',maxWidth:400}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>⚠️ Ban User</h2>
              <button onClick={()=>setBanModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--text3)',marginBottom:12}}>This will ban {selectedUser.fullName} from the platform.</p>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:'var(--text3)',marginBottom:4,display:'block'}}>Reason (optional)</label>
              <textarea className="input" style={{minHeight:80,resize:'none'}} value={banReason} onChange={(e)=>setBanReason(e.target.value)} placeholder="Why is this user being banned?" />
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setBanModal(false)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--red)',color:'white',border:'none',cursor:'pointer'}} onClick={handleBanUser} disabled={saving}>{saving ? 'Banning...' : 'Ban User'}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal && selectedUser && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setDeleteModal(false)}>
          <div className="card" style={{width:'90%',maxWidth:400}} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>🗑️ Delete User</h2>
              <button onClick={()=>setDeleteModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Permanently delete <strong>{selectedUser.fullName}</strong>? This action cannot be undone.</p>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-secondary btn-full" onClick={()=>setDeleteModal(false)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--red)',color:'white',border:'none',cursor:'pointer'}} onClick={handleDeleteUser} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
