import { useEffect } from 'react'
import { useToastStore } from '../../store/toastStore'

const COLOR_MAP = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
}

function ToastItem({ id, message, type, duration }) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id)
    }, duration)
    return () => clearTimeout(timer)
  }, [id, duration, removeToast])

  const colorClass = COLOR_MAP[type] ?? COLOR_MAP.info

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-64 max-w-sm transition-all duration-300 ${colorClass}`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 opacity-80 hover:opacity-100 transition-opacity ml-1"
        aria-label="Cerrar notificacion"
      >
        ✕
      </button>
    </div>
  )
}

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)
  const removeToast = useToastStore((s) => s.removeToast)
  return { addToast, removeToast }
}
