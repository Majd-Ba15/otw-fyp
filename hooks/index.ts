import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import * as signalR from '@microsoft/signalr'
import { notifAPI } from '../services/api'

interface JwtPayload { userId: string; role: string; exp: number }

// ── useAuth ───────────────────────────────────
export function useAuth(requiredRole?: string) {
  const router = useRouter()
  const [user, setUser] = useState<JwtPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('otw_token')
    if (!token) { router.push('/auth/login'); return }
    try {
      const decoded = jwtDecode<JwtPayload>(token)
      if (decoded.exp < Date.now() / 1000) { Cookies.remove('otw_token'); router.push('/auth/login'); return }
      if (requiredRole && decoded.role !== requiredRole) { router.push('/auth/login'); return }
      setUser(decoded)
    } catch { Cookies.remove('otw_token'); router.push('/auth/login') }
    finally { setLoading(false) }
  }, [])

  const logout = () => { Cookies.remove('otw_token'); router.push('/auth/login') }
  return { user, loading, logout }
}

// ── useSignalR ────────────────────────────────
export function useSignalR(rideId: number | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [driverLocation, setDriverLocation] = useState<{lat:number,lng:number}|null>(null)
  const connRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!rideId) return
    const token = Cookies.get('otw_token')
    const conn  = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/chat?access_token=${token}`)
      .withAutomaticReconnect()
      .build()

    conn.on('ReceiveMessage',    (msg) => setMessages(p => [...p, msg]))
    conn.on('UserTyping',        ()    => { setIsTyping(true); setTimeout(() => setIsTyping(false), 2000) })
    conn.on('LocationUpdated',   (loc) => setDriverLocation({ lat: loc.lat, lng: loc.lng }))
    conn.on('ReceiveNotification', (n) => console.log('Notification:', n))

    conn.start()
      .then(() => conn.invoke('JoinRideGroup', rideId))
      .catch(console.error)
    connRef.current = conn

    return () => { conn.invoke('LeaveRideGroup', rideId).finally(() => conn.stop()) }
  }, [rideId])

  const sendMessage = useCallback(async (receiverId: number, content: string) => {
    if (!connRef.current || !rideId) return
    await connRef.current.invoke('SendMessage', rideId, receiverId, content)
  }, [rideId])

  const broadcastMessage = useCallback(async (content: string) => {
    if (!connRef.current || !rideId) return
    await connRef.current.invoke('BroadcastMessage', rideId, content)
  }, [rideId])

  const sendTyping = useCallback(async () => {
    if (!connRef.current || !rideId) return
    await connRef.current.invoke('Typing', rideId)
  }, [rideId])

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!connRef.current || !rideId) return
    await connRef.current.invoke('UpdateLocation', rideId, lat, lng)
  }, [rideId])

  return { messages, isTyping, driverLocation, sendMessage, broadcastMessage, sendTyping, updateLocation }
}

// ── useNotifications ──────────────────────────
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  const load = useCallback(async () => {
    try {
      const [n, c] = await Promise.all([notifAPI.getAll(), notifAPI.getUnreadCount()])
      setNotifications(n.data)
      setUnreadCount(c.data.count)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])
  return { notifications, unreadCount, reload: load }
}

// ── useDarkMode ───────────────────────────────
export function useDarkMode() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('otw-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('otw-theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return { dark, toggle }
}
