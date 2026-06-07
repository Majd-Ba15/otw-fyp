import { useEffect } from 'react'
import { useRouter } from 'next/router'
export default function RiderNotifications() {
  const router = useRouter()
  useEffect(()=>{ router.replace('/notifications') },[])
  return null
}
