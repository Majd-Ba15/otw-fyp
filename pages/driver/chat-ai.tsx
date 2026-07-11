import { useState, useEffect, useRef } from 'react'
import Layout, { I } from '../../components/layout/Layout'
import { chatAPI, userAPI, notifAPI } from '../../services/api'

export default function DriverChatAI() {
  const [profile,  setProfile]  = useState<any>(null)
  const [messages, setMessages] = useState<Array<{id:number,role:'ai'|'user',text:string}>>([
    { id:0, role:'ai', text:"Hi! I'm your OTW driver assistant. How can I help you today?" }
  ])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const quickQs = ['How do I post a ride?','How do I accept a booking?','How do I get verified?','How do I cancel a posted ride?','How do ratings work?']

  useEffect(() => {
    Promise.allSettled([
      userAPI.getMe(),
      notifAPI.getUnreadCount(),
    ]).then(([p, n]) => {
      if (p.status === 'fulfilled') setProfile(p.value.data)
      if (n.status === 'fulfilled') setUnread(n.value.data?.count || 0)
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async (msg?:string) => {
    const text = (msg ?? input).trim()
    if (!text || loading) return
    const userMsg = { id:Date.now(), role:'user' as const, text }
    setInput('')
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)
    try {
      const history = next.filter(m => m.role !== 'ai' || next.indexOf(m) > 0).map(m => ({ role: m.role, text: m.text }))
      const r = await chatAPI.support({ message:text, context:'driver', history })
      setMessages(p => [...p, { id:Date.now()+1, role:'ai', text:r.data.reply }])
    } catch {
      setMessages(p => [...p, { id:Date.now()+1, role:'ai', text:"Sorry, I couldn't connect right now. Please try again." }])
    } finally { setLoading(false) }
  }

  const initials = profile?.fullName?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase() || 'SM'

  return (
    <Layout title="AI assistant" role="Driver" userInitials={initials} unreadCount={unread}>
      <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 48px)'}}>

        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',maxWidth:700,margin:'0 auto',width:'100%',padding:'0 20px'}}>
          {/* Bot header */}
          <div style={{padding:'20px 0 14px',borderBottom:'1px solid var(--border)',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,background:'var(--blue-l)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{width:22,height:22,color:'var(--blue)',display:'flex'}}>{I.robot}</span>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:'var(--text)'}}>OTW Assistant</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:13,color:'var(--text3)',marginTop:2}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#22C55E'}}/>
                  Online · AI powered
                </div>
              </div>
            </div>
            <div style={{marginTop:14,borderTop:'1px solid var(--border)'}}/>
          </div>

          {/* Quick chips */}
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
            {quickQs.map(q => (
              <button key={q} className="chip" onClick={()=>send(q)}>{q}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:12,paddingBottom:12}}>
            {messages.map(m => (
              <div key={m.id} style={{display:'flex',justifyContent:m.role==='ai'?'flex-start':'flex-end'}}>
                <div style={{maxWidth:'75%',padding:'10px 14px',borderRadius:16,fontSize:14,lineHeight:1.5,
                  whiteSpace:'pre-wrap',
                  background:m.role==='ai'?'var(--bg-card)':'var(--blue)',
                  color:m.role==='ai'?'var(--text)':'white',
                  border:m.role==='ai'?'1px solid var(--border)':'none',
                  borderBottomLeftRadius:m.role==='ai'?4:16,
                  borderBottomRightRadius:m.role==='user'?4:16}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <div style={{padding:'10px 14px',borderRadius:16,fontSize:14,background:'var(--bg-card)',border:'1px solid var(--border)',color:'var(--text3)',borderBottomLeftRadius:4}}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{padding:'12px 0 20px',borderTop:'1px solid var(--border)'}}>
            <div style={{display:'flex',gap:10,background:'var(--bg-card)',border:'1px solid var(--border2)',borderRadius:24,padding:'8px 8px 8px 16px',alignItems:'center'}}>
              <input style={{flex:1,border:'none',background:'transparent',outline:'none',fontSize:14,color:'var(--text)',fontFamily:'inherit'}}
                placeholder="Ask me anything..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
              <button onClick={()=>send()} disabled={!input.trim()||loading}
                style={{width:36,height:36,background:'var(--blue)',border:'none',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',opacity:!input.trim()||loading?.5:1,flexShrink:0}}>
                <span style={{width:16,height:16,color:'white',display:'flex'}}>{I.send}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
