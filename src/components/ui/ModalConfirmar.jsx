import { useEffect, useRef } from 'react'

export default function ModalConfirmar({ open, titulo, warnings, onCancel, onConfirm, confirmando }) {
  const ref = useRef(null)

  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={ref}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Revisa los datos antes de confirmar.</p>
          </div>
        </div>

        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>

        <p className="text-sm text-gray-600">¿Confirmas de todas formas?</p>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={confirmando}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Corregir
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmando}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:bg-blue-300"
          >
            {confirmando ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
