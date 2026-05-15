const STATUS_CONFIG = {
  new: {
    label: 'New',
    className:
      'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  ready: {
    label: 'Ready',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#555]/30 text-[#a0a0a0] border-[#555]/40',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-[#9333ea]/15 text-[#c084fc] border-[#9333ea]/30',
  },
}

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'bg-[#555]/30 text-[#a0a0a0] border-[#555]/40',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase ${config.className}`}
    >
      {config.label}
    </span>
  )
}

const COLOR_MAP = {
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple: 'bg-[#9333ea]/15 text-[#c084fc] border-[#9333ea]/30',
  gray: 'bg-[#555]/30 text-[#a0a0a0] border-[#555]/40',
  white: 'bg-white/10 text-[#f0f0f0] border-white/20',
}

export function Badge({ children, color = 'gray' }) {
  const className = COLOR_MAP[color] || COLOR_MAP.gray
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide ${className}`}
    >
      {children}
    </span>
  )
}
