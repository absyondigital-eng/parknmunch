import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const BOTTOM_NAV = [
  {
    to: '/orders',
    label: 'Orders',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    label: 'Menu',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h7" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newOrderCount] = useState(0)

  // Close sidebar on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setSidebarOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lock scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:z-30">
        <Sidebar newOrderCount={newOrderCount} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden animate-slideIn">
            <Sidebar
              onClose={() => setSidebarOpen(false)}
              newOrderCount={newOrderCount}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d0d] border-b border-white/[0.07] sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-white/10 transition-all"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">🍔</span>
            <span className="font-bold text-[#f0f0f0] text-sm">Park N Munch</span>
            <span className="bg-[#9333ea]/20 text-[#c084fc] text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-widest uppercase">
              Admin
            </span>
          </div>

          {newOrderCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {newOrderCount}
            </span>
          )}
          {newOrderCount === 0 && <div className="w-8" />}
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0d0d0d] border-t border-white/[0.07] flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#9333ea]' : 'text-[#555] hover:text-[#a0a0a0]'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
