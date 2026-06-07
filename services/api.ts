import axios from 'axios'
import Cookies from 'js-cookie'

// /backend-api/* is proxied by Next.js → backend (no CORS, no port conflicts with local /api/* routes)
const API = axios.create({ baseURL: '/backend-api' })

API.interceptors.request.use(cfg => {
  const token = Cookies.get('otw_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    Cookies.remove('otw_token')
    if (typeof window !== 'undefined') window.location.href = '/auth/login'
  }
  return Promise.reject(err)
})

// Upload helper — converts file to base64 and sends as JSON (no multipart parsing needed)
const uploadFile = async (file: File, query = '') => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const token = Cookies.get('otw_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/upload${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base64, name: file.name, type: file.type }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Upload failed')
  return { data }
}

export const authAPI = {
  register:       (d: any)              => API.post('/api/auth/register', d),
  verifyOtp:      (d: any)              => API.post('/api/auth/verify-otp', d),
  resendOtp:      (d: any)              => API.post('/api/auth/resend-otp', d),
  login:          (d: any)              => API.post('/api/auth/login', d),
  forgotPassword: (d: any)              => API.post('/api/auth/forgot-password', d),
  resetPassword:  (token: string, d: any) => API.post(`/api/auth/reset-password?token=${token}`, d),
}
export const userAPI = {
  getMe:           ()                 => API.get('/api/users/me'),
  updateMe:        (d: any)           => API.put('/api/users/me', d),
  uploadPhoto:     (f: File)            => uploadFile(f),
  uploadId:        (f: File)            => uploadFile(f),
  saveCar:         (d: any)             => API.post('/api/users/car', d),
  uploadCarPhoto:  (f: File, t: string) => uploadFile(f, `?type=${t}`),
  getStats:        ()                 => API.get('/api/users/stats'),
  getProfile:      (id: number)       => API.get(`/api/users/${id}/profile`),
  getFavourites:   ()                 => API.get('/api/users/favourites'),
  addFavourite:    (d: any)           => API.post('/api/users/favourites', d),
  deleteFavourite: (id: number)       => API.delete(`/api/users/favourites/${id}`),
  toggleAvailability: ()              => API.put('/api/users/availability'),
  remindVerification: ()              => API.post('/api/users/remind-verification'),
}
export const rideAPI = {
  search:          (p: any)           => API.get('/api/rides/search', { params: p }),
  getById:         (id: number)       => API.get(`/api/rides/${id}`),
  getByToken:      (token: string)    => API.get(`/api/rides/share/${token}`),
  getMine:         (status?: string)  => API.get('/api/rides/mine', { params: { status } }),
  getActiveRide:   ()                 => API.get('/api/rides/mine/active'),
  post:            (d: any)           => API.post('/api/rides', d),
  update:          (id: number, d: any) => API.put(`/api/rides/${id}`, d),
  cancel:          (id: number)       => API.delete(`/api/rides/${id}`),
  getPassengers:   (id: number)       => API.get(`/api/rides/${id}/passengers`),
  startRide:       (id: number)       => API.put(`/api/rides/${id}/start`),
  endRide:         (id: number)       => API.put(`/api/rides/${id}/end`),
}
export const bookingAPI = {
  book:            (d: any)           => API.post('/api/bookings', d),
  getUpcoming:     ()                 => API.get('/api/bookings/upcoming'),
  getActive:       ()                 => API.get('/api/bookings/active'),
  getHistory:      (status?: string)  => API.get('/api/bookings/history', { params: { status } }),
  getRequests:     ()                 => API.get('/api/bookings/requests'),
  accept:          (id: number)       => API.put(`/api/bookings/${id}/accept`),
  decline:         (id: number)       => API.put(`/api/bookings/${id}/decline`),
  cancel:          (id: number)       => API.put(`/api/bookings/${id}/cancel`),
  complete:        (id: number)       => API.put(`/api/bookings/${id}/complete`),
}
export const messageAPI = {
  getMessages:      (rideId: number)  => API.get(`/api/messages/${rideId}`),
  send:             (d: any)          => API.post('/api/messages', d),
  getConversations: ()                => API.get('/api/messages/conversations'),
  broadcast:        (d: any)          => API.post('/api/messages/broadcast', d),
  getContacts:      ()                => API.get('/api/messages/contacts'),
}
export const ratingAPI = {
  rate:        (d: any)               => API.post('/api/ratings', d),
  getUserRatings: (id: number)        => API.get(`/api/ratings/user/${id}`),
}
export const notifAPI = {
  getAll:      ()                     => API.get('/api/notifications'),
  getUnreadCount: ()                  => API.get('/api/notifications/unread-count'),
  readAll:     ()                     => API.put('/api/notifications/read-all'),
  markRead:    (id: number)           => API.put(`/api/notifications/${id}/read`),
}
export const reportAPI = {
  file:        (d: any)               => API.post('/api/reports', d),
  getMine:     ()                     => API.get('/api/reports/mine'),
}
export const chatAPI = {
  support: async (d: any) => {
    const token = Cookies.get('otw_token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/chat/support', { method: 'POST', headers, body: JSON.stringify(d) })
    const data = await res.json()
    return { data }
  },
  getHistory:     ()                  => API.get('/api/chat/history'),
  getSuggestions: ()                  => API.post('/api/chat/suggestions'),
}
export const locationAPI = {
  update:         (d: any)            => API.put('/api/location/update', d),
  getHistory:     (rideId: number)    => API.get(`/api/location/history/${rideId}`),
}
export const adminAPI = {
  getStats:       ()                          => API.get('/api/admin/stats'),
  getActivity:    ()                          => API.get('/api/admin/activity'),
  getUsers:       (p?: any)                   => API.get('/api/admin/users', { params: p }),
  getUser:        (id: number)                => API.get(`/api/admin/users/${id}`),
  getPending:     ()                          => API.get('/api/admin/verifications/pending'),
  approve:        (id: number)                => API.put(`/api/admin/verifications/${id}/approve`),
  reject:         (id: number, d: any)        => API.put(`/api/admin/verifications/${id}/reject`, d),
  warn:           (id: number, d: any)        => API.put(`/api/admin/users/${id}/warn`, d),
  suspend:        (id: number)                => API.put(`/api/admin/users/${id}/suspend`),
  ban:            (id: number)                => API.delete(`/api/admin/users/${id}/ban`),
  getRides:       (status?: string)           => API.get('/api/admin/rides', { params: { status } }),
  getReports:     (status?: string)           => API.get('/api/admin/reports', { params: { status } }),
  getReport:      (id: number)                => API.get(`/api/admin/reports/${id}`),
  resolveReport:  (id: number, d: any)        => API.put(`/api/admin/reports/${id}/resolve`, d),
  getAnalytics:   ()                          => API.get('/api/admin/analytics'),
}
export default API
