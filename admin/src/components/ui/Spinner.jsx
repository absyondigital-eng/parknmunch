const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
  xl: 'w-16 h-16 border-4',
}

export function Spinner({ size = 'md' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md

  return (
    <span
      className={`inline-block ${sizeClass} rounded-full border-[#9333ea]/30 border-t-[#9333ea] animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}
