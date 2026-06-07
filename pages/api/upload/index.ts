import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  try {
    const { base64, name } = req.body
    if (!base64 || !name) return res.status(400).json({ message: 'No file data received' })

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

    const ext = (name.split('.').pop() || 'jpg').toLowerCase()
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    const buffer = Buffer.from(base64, 'base64')
    fs.writeFileSync(filePath, buffer)

    return res.status(200).json({ url: `/uploads/${filename}`, isVerified: false, message: 'Uploaded' })
  } catch (err: any) {
    console.error('Upload error:', err)
    return res.status(500).json({ message: err.message || 'Upload failed' })
  }
}
