// components/shared/UniversityBadge.tsx
// Small pill shown next to a name — reuses the app's existing .badge/.badge-*
// classes (see globals.css) so it looks consistent with every other badge.
// Renders nothing for an unset university or "OTHER" — nothing meaningful to show.

import { findUniversity } from '../../lib/universities'

interface Props {
  code?:       string | null
  campusName?: string | null
  showCampus?: boolean   // include the campus name text (used on the full profile page)
}

export default function UniversityBadge({ code, campusName, showCampus = false }: Props) {
  const uni = findUniversity(code || undefined)
  if (!uni || uni.code === 'OTHER') return null

  return (
    <span className="badge badge-blue" title={uni.name}>
      <GradCapIcon />
      {uni.code}
      {showCampus && campusName && <span style={{ opacity: 0.8 }}> · {campusName}</span>}
    </span>
  )
}

function GradCapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  )
}
