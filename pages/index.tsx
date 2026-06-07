import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { I } from '../components/layout/Layout'

export default function Welcome() {
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (token) {
      try {
        const d: any = jwtDecode(token)
        if (d.exp > Date.now() / 1000) {
          if (d.role === 'Rider')  router.replace('/rider/dashboard')
          else if (d.role === 'Driver') router.replace('/driver/dashboard')
          else if (d.role === 'Admin')  router.replace('/admin/dashboard')
        }
      } catch {}
    }
  }, [])

  const features = [
    { icon: I.shield,  title: 'University verified only',  desc: 'Every student verified by email and student ID' },
    { icon: I.msg,     title: 'Real-time chat',             desc: 'Message your driver or passenger live' },
    { icon: I.pin,     title: 'Live location tracking',     desc: 'See where your driver is in real time' },
    { icon: I.dollar,  title: 'Split costs easily',         desc: 'Agree on cash upfront with transparent pricing' },
  ]

  const steps = [
    {
      n: 1,
      img: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400&h=280&fit=crop&q=80',
      title: 'Create an account',
      desc: 'Sign up with your university email and verify your ID.',
    },
    {
      n: 2,
      img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=280&fit=crop&q=80',
      title: 'Find or offer a ride',
      desc: 'Search for rides or post your own route.',
    },
    {
      n: 3,
      img: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=280&fit=crop&q=80',
      title: 'Connect & ride',
      desc: 'Chat, confirm, and ride together safely.',
    },
    {
      n: 4,
      img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=280&fit=crop&q=80',
      title: 'Split & save',
      desc: 'Split the cost fairly and save money.',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 70,
        background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(10px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: 'white', borderRadius: 10, padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/otw.png" alt="OTW" style={{ width: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>OTW</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, textTransform: 'uppercase' }}>On The Way</div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="landing-nav">
          <a href="#" className="landing-nav-link active">Home</a>
          <a href="#how-it-works" className="landing-nav-link">How it works</a>
          <a href="#safety" className="landing-nav-link">Safety</a>
          <a href="#about" className="landing-nav-link">About us</a>
          <a href="#contact" className="landing-nav-link">Contact</a>
        </nav>

        {/* CTA */}
        <Link href="/auth/register">
          <button style={{
            background: 'var(--green)', color: 'white', border: 'none',
            borderRadius: 8, padding: '10px 24px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Get Started
          </button>
        </Link>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        overflow: 'hidden', background: '#0d1117',
      }}>
        {/* Background photo */}
        <img
          src="/hero.png"
          alt="Students carpooling"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', opacity: 1, filter: 'brightness(1.25) saturate(1.1)' }}
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.0) 100%)' }} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 60px', maxWidth: 640 }}>
          <h1 style={{ fontSize: 62, fontWeight: 800, color: 'white', lineHeight: 1.08, marginBottom: 16 }}>
            Ride together.<br />
            <span style={{ color: 'var(--green)' }}>Go further.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.82)', marginBottom: 40, lineHeight: 1.65, maxWidth: 380 }}>
            Safe, verified, and affordable rides<br />for university students.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 0 }}>
          <Link href="/auth/register" style={{ display: 'inline-block' }}>
            <button style={{
              background: 'var(--green)', color: 'white', border: 'none',
              borderRadius: 10, padding: '14px 34px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              Get started <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </button>
          </Link>
          <Link href="/auth/login" style={{ display: 'inline-block' }}>
            <button style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1.5px solid rgba(255,255,255,0.45)',
              borderRadius: 10,
              padding: '13px 36px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              transition: 'background .2s, border-color .2s',
              letterSpacing: 0.2,
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.75)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.45)'
              }}
            >
              I already have an account
            </button>
          </Link>
          </div>
        </div>

        {/* Trusted badge */}
        <div style={{
          position: 'absolute', bottom: 56, right: 60, zIndex: 1,
          background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.22)', borderRadius: 18,
          padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ display: 'flex' }}>
            {['MK', 'AS', 'NR'].map((init, i) => (
              <div key={i} style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--green)',
                color: 'white', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2.5px solid white', marginLeft: i > 0 ? -10 : 0,
              }}>{init}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Trusted by</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Students across<br />universities</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES BAR ───────────────────────────────────────────────── */}
      <section style={{ background: '#f8f9fa', padding: '0 40px 60px' }}>
        <div style={{
          maxWidth: 920, margin: '0 auto',
          background: 'white', borderRadius: 22,
          boxShadow: '0 10px 48px rgba(0,0,0,0.11)',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          marginTop: -60, padding: '38px 24px',
          position: 'relative', zIndex: 10,
        }}>
          {features.map((f, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '0 18px',
              borderRight: i < 3 ? '1px solid #E5E7EB' : 'none',
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: 14,
                background: 'var(--green-l)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <span style={{ width: 26, height: 26, color: 'var(--green)', display: 'flex' }}>{f.icon}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '72px 40px 80px', background: '#fff' }}>
        <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 800, color: '#111827', marginBottom: 52 }}>
          How it works
        </h2>
        <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative' }}>
          {/* Dashed connector */}
          <div style={{
            position: 'absolute', top: 88, left: '13%', right: '13%',
            height: 0, borderTop: '2.5px dashed #D1D5DB', zIndex: 0,
          }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ padding: '0 14px', position: 'relative', zIndex: 1 }}>
                {/* Step image */}
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <img
                    src={s.img}
                    alt={s.title}
                    style={{ width: '100%', height: 182, objectFit: 'cover', borderRadius: 14 }}
                  />
                  {/* Step number badge */}
                  <div style={{
                    position: 'absolute', bottom: -14, left: 16,
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--green)', color: 'white',
                    fontSize: 15, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid white', boxShadow: '0 2px 10px rgba(26,171,109,0.4)',
                  }}>{s.n}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 5 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY SECTION ─────────────────────────────────────────────── */}
      <section id="safety" style={{ padding: '72px 40px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--green-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ width: 32, height: 32, color: 'var(--green)', display: 'flex' }}>{I.shield}</span>
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 16 }}>Your safety is our priority</h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
            Every driver and rider is verified using university email and government ID. Real-time SOS, live location sharing, and community ratings keep every ride safe.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {[
              { icon: I.id,      title: 'ID Verified',        desc: 'Government ID checked before every account' },
              { icon: I.shield,  title: 'SOS Button',         desc: 'One-tap emergency alert at any moment' },
              { icon: I.star,    title: 'Community Ratings',  desc: 'Mutual ratings keep the community accountable' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--green-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <span style={{ width: 22, height: 22, color: 'var(--green)', display: 'flex' }}>{item.icon}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────────────────── */}
      <section id="about" style={{ padding: '72px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#111827', marginBottom: 16 }}>About OTW</h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.75, maxWidth: 600, margin: '0 auto' }}>
            OTW (On The Way) was built for university students who need affordable, reliable, and safe transportation. We connect students going the same direction — reducing costs, carbon footprint, and the stress of commuting.
          </p>
        </div>
      </section>

      {/* ── CONTACT ────────────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: '72px 40px', background: 'var(--green)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 14 }}>Ready to ride?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', marginBottom: 36, lineHeight: 1.65 }}>
            Join your university's carpooling community today. Free to sign up, safe to ride.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register">
              <button style={{
                background: 'white', color: 'var(--green)', border: 'none',
                borderRadius: 10, padding: '14px 36px',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}>
                Get started
              </button>
            </Link>
            <Link href="/auth/login">
              <button style={{
                background: 'transparent', color: 'white',
                border: '2px solid rgba(255,255,255,0.6)',
                borderRadius: 10, padding: '14px 36px',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}>
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0d1117', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'white', borderRadius: 6, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/otw.png" alt="OTW" style={{ width: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>© 2025 OTW · University Carpooling</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Support'].map(t => (
            <a key={t} href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{t}</a>
          ))}
        </div>
      </footer>

      <style>{`
        .landing-nav { display: flex; align-items: center; gap: 28px; }
        .landing-nav-link { font-size: 14px; color: rgba(255,255,255,0.82); text-decoration: none; transition: color .15s; }
        .landing-nav-link:hover { color: white; }
        .landing-nav-link.active { color: white; font-weight: 600; border-bottom: 2px solid var(--green); padding-bottom: 2px; }
        @media (max-width: 768px) {
          .landing-nav { display: none; }
          header { padding: 0 20px !important; }
        }
      `}</style>
    </div>
  )
}
