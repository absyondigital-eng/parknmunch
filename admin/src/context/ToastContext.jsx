import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = 'info') => {
      const id = ++toastIdCounter
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => removeToast(id), 4000)
      return id
    },
    [removeToast]
  )

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const typeStyles = {
  success: {
    border: 'border-green-500/40',
    icon: '✓',
    iconBg: 'bg-green-500/20 text-green-400',
    bar: 'bg-green-500',
  },
  error: {
    border: 'border-red-500/40',
    icon: '✕',
    iconBg: 'bg-red-500/20 text-red-400',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/40',
    icon: '⚠',
    iconBg: 'bg-amber-500/20 text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    border: 'border-[#9333ea]/40',
    icon: 'i',
    iconBg: 'bg-[#9333ea]/20 text-[#c084fc]',
    bar: 'bg-[#9333ea]',
  },
}

function ToastItem({ toast, onRemove }) {
  const styles = typeStyles[toast.type] || typeStyles.info

  return (
    <div
      className={`relative flex items-start gap-3 bg-[#1c1c1c] border ${styles.border} rounded-xl p-4 shadow-2xl min-w-[280px] max-w-[380px] animate-slideIn overflow-hidden`}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${styles.bar} animate-[shrink_4s_linear_forwards]`}
        style={{ width: '100%' }}
      />

      {/* Icon */}
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${styles.iconBg}`}
      >
        {styles.icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm text-[#f0f0f0] leading-snug pt-0.5">{toast.message}</p>

      {/* Close */}
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-[#555] hover:text-[#f0f0f0] transition-colors text-lg leading-none mt-0.5"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end sm:items-end"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}
