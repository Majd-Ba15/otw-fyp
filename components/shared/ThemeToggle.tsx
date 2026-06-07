// components/shared/ThemeToggle.tsx
import { useDarkMode } from '../../hooks'

interface ThemeToggleProps {
  showLabel?: boolean
}

export default function ThemeToggle({ showLabel }: ThemeToggleProps) {
  const { dark, toggle } = useDarkMode()

  return (
    <button
      onClick={toggle}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            6,
        background:     dark ? '#1a1a1a' : '#f0f0f0',
        border:         '0.5px solid var(--border)',
        borderRadius:   20,
        padding:        '5px 12px',
        cursor:         'pointer',
        fontSize:       12,
        color:          'var(--text2)',
        transition:     'all .2s',
      }}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span style={{ fontSize: 16 }}>{dark ? '☀️' : '🌙'}</span>
      {showLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
