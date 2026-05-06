import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { obtenerReoperturas } from '../../hooks/useRegistros'

function formatFechaHora(fecha) {
  if (!fecha) return '—'
  try {
    return format(parseISO(fecha), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
  } catch {
    return fecha
  }
}

export default function HistorialReoperturas({ registroId }) {
  const [reaperturas, setReoperturas] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!registroId) {
      setReoperturas([])
      return
    }

    setLoading(true)
    obtenerReoperturas(registroId)
      .then((data) => setReoperturas(data))
      .finally(() => setLoading(false))
  }, [registroId])

  if (!registroId) return null

  if (loading) {
    return (
      <div className="py-3 text-sm text-gray-400">Cargando historial...</div>
    )
  }

  if (reaperturas.length === 0) {
    return (
      <div className="py-3 text-sm text-gray-400 italic">Sin reaperturas</div>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      {reaperturas.map((r) => (
        <div
          key={r.id}
          className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"
        >
          <div className="flex items-center justify-between gap-4 mb-0.5">
            <span className="font-medium text-gray-800">{r.owner_nombre}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatFechaHora(r.created_at)}
            </span>
          </div>
          <p className="text-gray-600 text-xs leading-relaxed">{r.motivo}</p>
        </div>
      ))}
    </div>
  )
}
