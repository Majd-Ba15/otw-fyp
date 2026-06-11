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
      <section className="hero">
        <div className="hero-photo" aria-hidden="true">
          <img src="/otw-bg.png" alt="" />
        </div>

        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-bottom" aria-hidden="true" />

        <Link
          href="/"
          className="brand"
          aria-label="OTW home"
          style={{
            position: 'fixed',
            top: 14,
            left: 18,
            zIndex: 9999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 18,
            padding: '6px 14px 6px 6px',
            borderRadius: 12,
            background: 'rgba(0, 0, 0, 0.62)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            textDecoration: 'none',
            textShadow: '0 3px 16px rgba(0, 0, 0, 0.75)',
          }}
        >
          <span
            className="brand-mark"
            style={{
              width: 62,
              height: 62,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
              padding: 6,
              borderRadius: 8,
              background: '#fff',
              boxShadow: '0 10px 26px rgba(0, 0, 0, 0.22)',
            }}
          >
            <img src="/otw.png" alt="OTW" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </span>
          <span className="brand-copy">
            <strong style={{ fontSize: 38, fontWeight: 900, letterSpacing: 0 }}>OTW</strong>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'rgba(255, 255, 255, 0.76)' }}>
              On The Way
            </span>
          </span>
        </Link>

        <div className="hero-content">
          <h1>
            Safe University
            <br />
            Carpooling
            <br />
            <span>for Students</span>
          </h1>

          <p>
            OTW connects verified university students traveling the same way. Share rides, reduce
            transportation costs, and commute safely together.
          </p>

          <div className="actions">
            <Link
              href="/auth/register"
              className="btn btn-primary"
              style={{
                width: 285,
                height: 92,
                padding: '0 38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderRadius: 8,
                background: '#14b978',
                color: '#fff',
                fontSize: 22,
                fontWeight: 800,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 16px 36px rgba(20, 185, 120, 0.28)',
              }}
            >
              Get started <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link
              href="/auth/login"
              className="btn btn-secondary"
              style={{
                width: 390,
                height: 92,
                padding: '0 38px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.24)',
                background: 'rgba(2, 8, 10, 0.5)',
                backdropFilter: 'blur(10px)',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 22,
                fontWeight: 800,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              I already have an account
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

        <div className="wave" aria-hidden="true" />
      </section>

      <style jsx>{`
        .welcome {
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #02080a;
          color: #fff;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .hero {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #02080a;
          isolation: isolate;
        }

        .hero-photo {
          position: absolute;
          inset: 0 0 0 auto;
          width: 70%;
          min-width: 760px;
          z-index: 0;
        }

        .hero-photo::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            90deg,
            #02080a 0%,
            rgba(2, 8, 10, 0.96) 4%,
            rgba(2, 8, 10, 0.62) 16%,
            rgba(2, 8, 10, 0.16) 30%,
            rgba(2, 8, 10, 0) 48%
          );
          pointer-events: none;
        }

        .hero-photo img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center center;
        }

        .hero-shade {
          position: absolute;
          inset: 0 auto 0 0;
          width: min(47vw, 680px);
          z-index: 1;
          background: linear-gradient(
            90deg,
            #02080a 0%,
            rgba(2, 8, 10, 0.99) 62%,
            rgba(2, 8, 10, 0.86) 78%,
            rgba(2, 8, 10, 0) 100%
          );
          pointer-events: none;
        }

        .hero-bottom {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.22) 0%,
            rgba(0, 0, 0, 0) 32%,
            rgba(0, 0, 0, 0.34) 100%
          );
          pointer-events: none;
        }

        .brand {
          position: fixed;
          top: 14px;
          left: 18px;
          z-index: 9999;
          display: inline-flex;
          align-items: center;
          gap: 18px;
          color: #fff;
          text-decoration: none;
          padding: 6px 14px 6px 6px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.48);
          backdrop-filter: blur(10px);
          text-shadow: 0 3px 16px rgba(0, 0, 0, 0.75);
        }

        .brand-mark {
          width: 62px;
          height: 62px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          padding: 6px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
        }

        .brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-copy {
          display: grid;
          gap: 2px;
          line-height: 1;
          text-transform: uppercase;
        }

        .brand-copy strong {
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .brand-copy span {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 3px;
          color: rgba(255, 255, 255, 0.76);
        }

        .hero-content {
          position: relative;
          z-index: 4;
          width: min(42vw, 560px);
          margin-left: 18px;
          padding-top: clamp(96px, 14vh, 132px);
        }

        h1 {
          margin: 0 0 20px;
          color: #fff;
          font-size: clamp(54px, 5.2vw, 78px);
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: 0;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        h1 span {
          color: #14b978;
        }

        p {
          max-width: 460px;
          margin: 0 0 28px;
          color: rgba(255, 255, 255, 0.72);
          font-size: clamp(17px, 1.4vw, 22px);
          font-weight: 600;
          line-height: 1.35;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 26px;
        }

        .btn {
          height: 92px;
          padding: 0 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 22px;
          font-weight: 800;
          text-decoration: none;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease,
            box-shadow 0.2s ease;
          white-space: nowrap;
        }

        .btn:hover {
          transform: translateY(-2px);
        }

        .btn-primary {
          width: 285px;
          gap: 10px;
          background: #14b978;
          color: #fff;
          box-shadow: 0 16px 36px rgba(20, 185, 120, 0.28);
        }

        .btn-primary:hover {
          background: #10a86c;
          box-shadow: 0 18px 42px rgba(20, 185, 120, 0.34);
        }

        .btn-secondary {
          width: 390px;
          color: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(2, 8, 10, 0.5);
          backdrop-filter: blur(10px);
        }

        .btn-secondary:hover {
          border-color: rgba(255, 255, 255, 0.42);
          background: rgba(2, 8, 10, 0.66);
        }

        .feature-bar {
          width: min(39vw, 545px);
          min-height: 78px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(2, 8, 10, 0.56);
          backdrop-filter: blur(14px);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.24);
        }

        .feature {
          min-width: 0;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
        }

        .feature-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #14b978;
          color: #fff;
          box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
        }

        .feature-icon :global(svg) {
          width: 18px;
          height: 18px;
        }

        .wave {
          position: absolute;
          left: -42px;
          bottom: -46px;
          z-index: 3;
          width: 620px;
          height: 190px;
          opacity: 0.32;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 48% 100%, rgba(20, 185, 120, 0.42), transparent 62%),
            repeating-linear-gradient(
              8deg,
              rgba(20, 185, 120, 0.26) 0,
              rgba(20, 185, 120, 0.26) 1px,
              transparent 1px,
              transparent 14px
            );
          transform: skewY(-8deg);
        }

        @media (max-width: 1180px) {
          .hero-photo {
            width: 76%;
            min-width: 660px;
          }

          .hero-content {
            width: min(50vw, 520px);
          }

          .feature-bar {
            width: min(50vw, 545px);
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .hero {
            min-height: auto;
            padding-bottom: 30px;
          }

          .hero-photo {
            position: relative;
            width: 100%;
            min-width: 0;
            height: 46vh;
            min-height: 310px;
            margin-left: 0;
          }

          .hero-photo::before {
            background: linear-gradient(
              180deg,
              rgba(2, 8, 10, 0) 0%,
              rgba(2, 8, 10, 0.1) 58%,
              #02080a 100%
            );
          }

          .hero-shade {
            display: none;
          }

          .brand {
            top: 10px;
            left: 14px;
          }

          .hero-content {
            width: auto;
            margin: -46px 18px 0;
            padding-top: 0;
          }

          h1 {
            font-size: clamp(42px, 12vw, 58px);
          }

          p {
            max-width: 560px;
          }

          .actions {
            flex-wrap: wrap;
            gap: 14px;
          }

          .btn {
            width: 100%;
            max-width: 390px;
            height: 72px;
          }

          .feature-bar {
            width: 100%;
            max-width: 560px;
          }
        }

        @media (max-width: 520px) {
          .brand-copy strong {
            font-size: 28px;
          }

          .brand-copy span {
            font-size: 12px;
            letter-spacing: 2.4px;
          }

          .hero-photo {
            height: 42vh;
            min-height: 270px;
          }

          .feature-bar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
