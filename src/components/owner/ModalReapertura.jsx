import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function formatFecha(fecha) {
  if (!fecha) return '—'
  try {
    return format(parseISO(fecha), "dd 'de' MMMM yyyy", { locale: es })
  } catch {
    return fecha
  }
}

function turnoLabel(turno) {
  if (turno === 'manana') return 'Mañana'
  if (turno === 'tarde') return 'Tarde'
  return turno ?? '—'
}

export default function ModalReapertura({ registro, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('')

  // Reset motivo each time a new registro opens
  useEffect(() => {
    if (registro) setMotivo('')
  }, [registro?.id])

  if (!registro) return null

  const motivoValido = motivo.trim().length >= 10

  function handleConfirm() {
    if (!motivoValido) return
    onConfirm(motivo.trim())
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reabrir cierre</h2>

        <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm text-gray-700 space-y-1">
          <div>
            <span className="font-medium text-gray-500">Fecha:</span>{' '}
            {formatFecha(registro.fecha)}
          </div>
          <div>
            <span className="font-medium text-gray-500">Turno:</span>{' '}
            {turnoLabel(registro.turno)}
          </div>
          <div>
            <span className="font-medium text-gray-500">Empleado:</span>{' '}
            {registro.empleado_nombre ?? '—'}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Motivo <span className="text-red-500">(obligatorio)</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
            rows={4}
            placeholder="Explica el motivo de la reapertura... (mínimo 10 caracteres)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            {motivo.trim().length} / 10 caracteres mínimos
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!motivoValido}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Confirmar reapertura
          </button>
        </div>
      </div>
    </div>
  )
}
