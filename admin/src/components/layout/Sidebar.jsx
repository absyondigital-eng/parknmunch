import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const NAV_LINKS = [
  {
    to: '/orders',
    label: 'Orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    to: '/menu',
    label: 'Menu Management',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h7"
        />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
]

export function Sidebar({ onClose, newOrderCount = 0 }) {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      toast.error('Failed to sign out. Please try again.')
    }
  }

  return (
    <aside className="flex flex-col h-full bg-[#0d0d0d] border-r border-white/[0.07]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
        <div className="w-10 h-10 rounded-xl bg-[#9333ea]/15 border border-[#9333ea]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🍔</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#f0f0f0] font-bold text-sm leading-tight truncate">Park N Munch</p>
          <span className="inline-block bg-[#9333ea]/20 text-[#c084fc] text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-widest uppercase mt-0.5">
            Admin
          </span>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/10 transition-all lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#9333ea]/15 text-[#c084fc] border border-[#9333ea]/25'
                  : 'text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[#9333ea]' : 'text-[#555]'}>{link.icon}</span>
                <span className="flex-1">{link.label}</span>
                {link.to === '/orders' && newOrderCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                    {newOrderCount > 99 ? '99+' : newOrderCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/[0.07]">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-[#555] text-[11px] uppercase tracking-widest mb-1">Signed in as</p>
            <p className="text-[#a0a0a0] text-xs truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#a0a0a0] hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
