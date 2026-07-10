// lib/text.ts
// Repairs "mojibake" — text that was stored as UTF-8 but then re-decoded as
// Windows-1252 somewhere upstream. This turns emoji and arrows into garbage, e.g.
//   →  becomes "â†'"   ✓  becomes "âœ\""   🎉  becomes "ðŸŽ‰"
//
// The backend holds the correct UTF-8 bytes; the corruption happens when those
// bytes are read back with the wrong charset. We can't change the upstream
// charset from the client, so we reverse the damage at render time: map each
// character back to the single Windows-1252 byte it came from, then decode those
// bytes as UTF-8.
//
// Note: it must be Windows-1252, not Latin-1. In CP1252 the bytes 0x80–0x9F map
// to punctuation/symbols whose Unicode codepoints are ABOVE 255 (e.g. 0x92 → ’,
// 0x86 → †), which is exactly what appears in the mangled arrows and emoji.

// Windows-1252 bytes 0x80–0x9F that differ from Latin-1, keyed by the resulting
// Unicode char → original byte. All other bytes (0x00–0x7F, 0xA0–0xFF) map 1:1
// to their codepoint, so they need no table.
const CP1252_REV: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

let decoder: TextDecoder | null = null

export function fixMojibake(input: unknown): string {
  if (typeof input !== 'string' || input.length === 0) return (input as string) ?? ''

  // Map every character back to its Windows-1252 byte. If any character isn't a
  // valid CP1252 output, the string contains genuine Unicode and was never
  // mangled — return it untouched.
  const bytes = new Uint8Array(input.length)
  let hasHighByte = false
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i)
    let byte: number
    if (code <= 0xff) {
      byte = code
    } else if (code in CP1252_REV) {
      byte = CP1252_REV[code]
    } else {
      return input // real Unicode → not mojibake
    }
    if (byte > 0x7f) hasHighByte = true
    bytes[i] = byte
  }
  if (!hasHighByte) return input // pure ASCII can't be mojibake

  try {
    if (!decoder) decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(bytes)
  } catch {
    return input // bytes weren't valid UTF-8 → original was already fine
  }
}

// Recursively repair every string inside an API response (objects/arrays/strings).
// Mutates and returns the same value so it can be dropped straight into an axios
// response interceptor. Non-string leaves and non-plain objects are left as-is.
// fixMojibake is idempotent, so running this on already-clean data is a no-op.
export function deepFixMojibake<T>(value: T): T {
  if (typeof value === 'string') return fixMojibake(value) as unknown as T
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = deepFixMojibake(value[i])
    return value
  }
  if (value && typeof value === 'object' && (value as object).constructor === Object) {
    const obj = value as Record<string, unknown>
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) obj[key] = deepFixMojibake(obj[key])
    }
    return value
  }
  return value
}
