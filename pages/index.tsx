import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { I } from '../components/layout/Layout'

const features = [
  { icon: I.shield, label: 'University verified' },
  { icon: I.msg, label: 'Real-time chat' },
  { icon: I.pin, label: 'Live location' },
  { icon: I.dollar, label: 'Fair cost splitting' },
]

export default function Welcome() {
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (token) {
      try {
        const d: any = jwtDecode(token)
        if (d.exp > Date.now() / 1000) {
          if (d.role === 'Rider') router.replace('/rider/dashboard')
          else if (d.role === 'Driver') router.replace('/driver/dashboard')
          else if (d.role === 'Admin') router.replace('/admin/dashboard')
        }
      } catch {}
    }
  }, [router])

  return (
    <main className="welcome">
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', padding: '14px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <Link href="/" aria-label="OTW home" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 14, textDecoration: 'none', color: '#111827' }}>
          <span className="brand-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 4, borderRadius: 16, background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.15, whiteSpace: 'nowrap' }}>
            <strong style={{ fontSize: 32, fontWeight: 800, letterSpacing: 0.5 }}>OTW</strong>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: 2, color: '#6b7280', textTransform: 'uppercase' }}>On The Way</span>
          </span>
        </Link>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>
            Safe University
            <br />
            Carpooling <span>for Students</span>
          </h1>

          <p>
            OTW connects verified university students traveling the same way. Share trips, reduce
            transportation costs, and commute safely together.
          </p>

          <div className="actions">
            <Link href="/auth/register" className="btn btn-primary">
              Sign up
            </Link>
            <Link href="/auth/login" className="btn btn-secondary">
              Login
            </Link>
          </div>

          <div className="feature-bar" aria-label="OTW features">
            {features.map((item) => (
              <div className="feature" key={item.label}>
                <span className="feature-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <img src="/otw-bg.png" alt="" />
        </div>
      </section>

      <style jsx>{`
        .brand-logo {
          width: 88px;
          height: 88px;
        }

        .welcome {
          width: 100%;
          min-height: 100vh;
          background: #f9fafb;
          color: var(--text, #111827);
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
          align-items: center;
          gap: 48px;
          max-width: 1240px;
          margin: 0 auto;
          padding: clamp(48px, 8vh, 96px) 32px;
          background: #f9fafb;
        }

        .hero-content {
          min-width: 0;
        }

        h1 {
          margin: 0 0 18px;
          color: var(--text, #111827);
          font-size: clamp(34px, 3.6vw, 48px);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: 0;
        }

        h1 span {
          color: var(--green, #1aab6d);
        }

        p {
          max-width: 460px;
          margin: 0 0 28px;
          color: var(--text3, #6b7280);
          font-size: clamp(15px, 1.1vw, 17px);
          font-weight: 500;
          line-height: 1.55;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .btn {
          height: 52px;
          padding: 0 26px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btn-primary {
          background: var(--green, #1aab6d);
          color: #fff;
          box-shadow: 0 8px 20px rgba(26, 171, 109, 0.28);
        }

        .btn-primary:hover {
          background: var(--green-d, #13895a);
          box-shadow: 0 10px 24px rgba(26, 171, 109, 0.34);
        }

        .btn-secondary {
          background: var(--bg-card, #fff);
          color: var(--text, #111827);
          border: 1.5px solid var(--border2, #d1d5db);
        }

        .btn-secondary:hover {
          border-color: var(--green, #1aab6d);
          color: var(--green, #1aab6d);
        }

        .feature-bar {
          max-width: 480px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .feature {
          min-width: 0;
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          padding: 14px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          background: #fff;
          color: var(--text2, #374151);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.2;
        }

        .feature-icon {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--green-l, #e8f8f1);
          color: var(--green, #1aab6d);
        }

        .feature-icon :global(svg) {
          width: 16px;
          height: 16px;
        }

        .hero-visual {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-visual img {
          width: 100%;
          max-width: 600px;
          aspect-ratio: 3 / 2;
          height: auto;
          display: block;
          object-fit: cover;
          border-radius: 16px;
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 32px 24px 48px;
          }

          .hero-visual {
            order: -1;
          }

          .hero-visual img {
            max-width: 600px;
          }

          .hero-content p {
            max-width: 560px;
          }

          .feature-bar {
            max-width: 560px;
          }
        }

        @media (max-width: 560px) {
          .brand-logo {
            width: 64px;
            height: 64px;
          }

          .hero {
            padding: 24px 16px 40px;
          }

          .actions {
            flex-direction: column;
            align-items: stretch;
          }

          .btn {
            width: 100%;
          }

          .feature-bar {
            grid-template-columns: 1fr;
          }

          .feature {
            padding: 12px;
          }
        }
      `}</style>
    </main>
  )
}
