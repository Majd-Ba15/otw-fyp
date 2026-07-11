import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } }

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_BYTES = 12 * 1024 * 1024   // 12 MB cap

// Identify the real image type from its magic bytes (not the client filename)
// and return a safe extension, or null if it isn't a known image. Prevents
// non-images / executable content (e.g. .html, .svg) being written to the
// public uploads folder and served same-origin as the app.
function detectImageExt(b: Buffer): string | null {
  if (b.length >= 3  && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length >= 8  && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png'
  if (b.length >= 6  && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'gif'
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp'
  return null
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  try {
    const { base64, name } = req.body
    if (!base64 || !name) return res.status(400).json({ message: 'No file data received' })

    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length === 0) return res.status(400).json({ message: 'Empty file' })
    if (buffer.length > MAX_BYTES) return res.status(400).json({ message: 'File too large (max 12 MB)' })

    // Only accept verified image content; the extension is decided by us, not the client.
    const ext = detectImageExt(buffer)
    if (!ext) return res.status(400).json({ message: 'Only JPG, PNG, GIF or WEBP images are allowed' })

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)
    fs.writeFileSync(filePath, buffer)

    return res.status(200).json({ url: `/uploads/${filename}`, isVerified: false, message: 'Uploaded' })
  } catch (err: any) {
    console.error('Upload error:', err)
    return res.status(500).json({ message: err.message || 'Upload failed' })
  }
}
