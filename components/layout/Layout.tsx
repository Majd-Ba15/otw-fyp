import { ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

// ── All SVG icons — no emoji ──────────────────────────────────────
export const I = {
  home:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  search:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  car:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h1l2-4h8l2 4h1a2 2 0 012 2v6a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>,
  map:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 16l5.447-2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 13V7"/></svg>,
  history:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  user:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  heart:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  star:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  starF:    <svg viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  robot:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V3M8 11V7a4 4 0 018 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/></svg>,
  bell:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  msg:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  sos:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  dash:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  shield:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  chart:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  alert:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  file:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  plus:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  back:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  eye:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeoff:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  lock:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  mail:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.96a16 16 0 006.13 6.13l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  id:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  camera:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  upload:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  check:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  checkC:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  clock:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  repeat:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  pin:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  send:     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  moon:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  sun:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  menu:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  share:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  link:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  trash:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  edit:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  logout:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  earnings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  nav:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  wifi:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 16 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  ticket:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6"/><path d="M2 15a3 3 0 000 6h20a3 3 0 000-6"/><path d="M2 9h20M2 15h20"/></svg>,
  info:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  drag:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>,
  x:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  more:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/></svg>,
  trending: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  dollar:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  pause:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  play:     <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
}

// ── useDarkMode hook ────────────────────────────────────────────────
export function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('otw-theme')
    const sys   = window.matchMedia('(prefers-color-scheme: dark)').matches
    const d     = saved ? saved === 'dark' : sys
    setDark(d)
    document.documentElement.classList.toggle('dark', d)
  }, [])
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('otw-theme', next ? 'dark' : 'light')
  }
  return { dark, toggle }
}

// ── Sidebar config ──────────────────────────────────────────────────
const RIDER_NAV = [
  { section: 'Rider' },
  { path:'/rider/dashboard',    icon:'dash',    label:'Dashboard' },
  { path:'/rider/search',       icon:'search',  label:'Search rides' },
  { path:'/rider/ride/[id]',    icon:'pin',     label:'Ride detail' },
  { path:'/rider/ride/active',  icon:'wifi',    label:'Active ride' },
  { path:'/rider/booking/confirm',icon:'ticket',label:'Booking confirm' },
  { path:'/rider/history',      icon:'history', label:'History' },
  { path:'/rider/rate/[id]',    icon:'star',    label:'Rate driver' },
  { path:'/rider/profile',      icon:'user',    label:'Profile' },
  { path:'/rider/favourites',   icon:'heart',   label:'Favourites' },
  { path:'/rider/waitlist',     icon:'clock',   label:'Waitlist' },
  { path:'/rider/report',       icon:'alert',   label:'Report issue' },
  { path:'/rider/chat-ai',      icon:'robot',   label:'AI assistant' },
]
const DRIVER_NAV = [
  { section: 'Driver' },
  { path:'/driver/dashboard',   icon:'dash',    label:'Dashboard' },
  { path:'/driver/post',        icon:'plus',    label:'Post a ride' },
  { path:'/driver/rides',       icon:'car',     label:'My rides' },
  { path:'/driver/ride/[id]',   icon:'settings',label:'Manage ride' },
  { path:'/driver/requests',    icon:'bell',    label:'Requests' },
  { path:'/driver/passengers/[id]',icon:'users',label:'Passengers' },
  { path:'/driver/ride/active', icon:'wifi',    label:'Active ride' },
  { path:'/driver/history',     icon:'history', label:'History' },
  { path:'/driver/rate/[id]',   icon:'star',    label:'Rate riders' },
  { path:'/driver/recurring',   icon:'repeat',  label:'Recurring' },
  { path:'/driver/stops',       icon:'map',     label:'Multiple stops' },
  { path:'/driver/earnings',    icon:'earnings',label:'Earnings' },
  { path:'/driver/vehicle',     icon:'car',     label:'Vehicle' },
  { path:'/driver/profile',     icon:'user',    label:'Profile' },
  { path:'/driver/chat-ai',     icon:'robot',   label:'AI assistant' },
]
const ADMIN_NAV = [
  { section: 'Admin' },
  { path:'/admin/dashboard',    icon:'dash',    label:'Dashboard' },
  { path:'/admin/users',        icon:'users',   label:'Users' },
  { path:'/admin/users/[id]',   icon:'user',    label:'User detail' },
  { path:'/admin/verifications',icon:'shield',  label:'Verifications' },
  { path:'/admin/rides',        icon:'car',     label:'All rides' },
  { path:'/admin/reports',      icon:'alert',   label:'Reports' },
  { path:'/admin/reports/[id]', icon:'file',    label:'Report detail' },
  { path:'/admin/analytics',    icon:'chart',   label:'Analytics' },
  { section: 'Shared' },
  { path:'/chat/[id]',          icon:'msg',     label:'Chat' },
  { path:'/notifications',      icon:'bell',    label:'Notifications' },
]
const SHARED_NAV = [
  { section: 'Shared' },
  { path:'/chat/[id]',   icon:'msg',  label:'Chat' },
  { path:'/notifications',icon:'bell',label:'Notifications' },
  { path:'/sos',          icon:'sos', label:'SOS' },
]

type Role = 'Rider'|'Driver'|'Admin'

interface LayoutProps {
  children:      ReactNode
  role?:         Role
  title?:        string
  showBack?:     boolean
  onBack?:       () => void
  unreadCount?:  number
  userInitials?: string
  userName?:     string
}

export default function Layout({ children, role, title, showBack, onBack, unreadCount=0, userInitials, userName }: LayoutProps) {
  const router  = useRouter()
  const { dark, toggle } = useDarkMode()
  const [sideOpen, setSideOpen] = useState(false)

  const handleBack = () => { if (onBack) onBack(); else router.back() }

  const handleLogout = () => {
    Cookies.remove('otw_token')
    router.push('/auth/login')
  }

  const nav =
    role === 'Driver' ? [...DRIVER_NAV, ...SHARED_NAV] :
    role === 'Admin'  ? ADMIN_NAV :
                        [...RIDER_NAV,  ...SHARED_NAV]

  const tbClass =
    role === 'Driver' ? 'topbar driver-bar' :
    role === 'Admin'  ? 'topbar admin-bar'  :
                        'topbar'

  const activeClass =
    role === 'Driver' ? 'active da' :
    role === 'Admin'  ? 'active aa' :
                        'active'

  const homePath =
    role === 'Driver' ? '/driver/dashboard' :
    role === 'Admin'  ? '/admin/dashboard'  :
                        '/rider/dashboard'

  const isActive = (p: string) => {
    if (p.includes('[id]')) {
      const base = p.replace('/[id]', '')
      return router.pathname.startsWith(base)
    }
    return router.pathname === p || router.pathname.startsWith(p + '/')
  }

  const navHref = (p: string) => {
    if (!p.includes('[id]')) return p
    const currentId = typeof router.query.id === 'string' ? Number(router.query.id) : 0
    if (currentId > 0) return p.replace('[id]', String(currentId))
    if (p.startsWith('/driver/')) return '/driver/rides'
    if (p.startsWith('/rider/')) return '/rider/dashboard'
    if (p.startsWith('/admin/')) return '/admin/dashboard'
    return '/chat'
  }

  const initials = userInitials || (() => {
    try {
      const d: any = jwtDecode(Cookies.get('otw_token') ?? '')
      return (d.name || d.email || '??').slice(0,2).toUpperCase()
    } catch { return '??' }
  })()

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* TOPBAR */}
      <header className={tbClass}>
        <button className="hamburger" onClick={() => setSideOpen(o => !o)} aria-label="Menu">
          <span style={{width:18,height:18,display:'flex'}}>{I.menu}</span>
        </button>
        {showBack
          ? <button className="topbar-icon-btn" onClick={handleBack} style={{background:'none',border:'none',cursor:'pointer'}}>
              <span style={{width:18,height:18,display:'flex'}}>{I.back}</span>
            </button>
          : <Link href={homePath} className="topbar-logo">
              <img src="/otw.png" alt="OTW"/>
            </Link>
        }
        <span className="topbar-title">{title || ''}</span>
        <div className="topbar-right">
          <button className="topbar-icon-btn" onClick={toggle} aria-label="Toggle theme">
            <span style={{width:16,height:16,display:'flex'}}>{dark ? I.sun : I.moon}</span>
          </button>
          {role && (
            <button className="topbar-icon-btn topbar-bell" onClick={() => router.push('/notifications')} aria-label="Notifications">
              <span style={{width:16,height:16,display:'flex'}}>{I.bell}</span>
              {unreadCount > 0 && <span className="nb">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          )}
          {role && <div className={`role-pill ${role.toLowerCase()}`}>{role}</div>}
          {role && (
            <div className="topbar-avatar" onClick={() => router.push(`/${role.toLowerCase()}/profile`)} title={userName}>
              {initials}
            </div>
          )}
        </div>
      </header>

      {/* SHELL */}
      {role ? (
        <div className="app-shell">
          {/* Overlay */}
          <div className={`sidebar-overlay ${sideOpen ? 'open' : ''}`} onClick={() => setSideOpen(false)} />
          {/* Sidebar */}
          <nav className={`sidebar ${sideOpen ? 'open' : ''}`}>
            {nav.map((item, i) => {
              if ('section' in item) return (
                <div key={i} className="sidebar-section">{item.section}</div>
              )
              return (
                <Link
                  key={item.path}
                  href={navHref(item.path)}
                  className={`sidebar-link ${isActive(item.path) ? activeClass : ''}`}
                  onClick={() => setSideOpen(false)}
                >
                  <span style={{width:16,height:16,display:'flex'}}>{(I as any)[item.icon]}</span>
                  {item.label}
                </Link>
              )
            })}
            {role === 'Admin' && (
              <button
                onClick={handleLogout}
                className="sidebar-link"
                style={{marginTop:'auto',width:'100%',background:'none',border:'none',cursor:'pointer',color:'var(--red,#EF4444)',textAlign:'left'}}
              >
                <span style={{width:16,height:16,display:'flex'}}>{I.logout}</span>
                Logout
              </button>
            )}
          </nav>
          {/* Content */}
          <main className="page-content">
            {children}
          </main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  )
}
