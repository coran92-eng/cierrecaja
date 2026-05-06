const VARIANTES = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error:   'bg-red-100 text-red-800',
  info:    'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-700',
}

export default function Badge({ variant = 'neutral', children }) {
  const clases = VARIANTES[variant] ?? VARIANTES.neutral
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${clases}`}>
      {children}
    </span>
  )
}
