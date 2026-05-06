function formatEuros(valor) {
  return Number(valor ?? 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

export default function DatafonoPanel({ value = [], onChange, readOnly = false }) {
  const tiene3 = value.length >= 3

  function handleToggle3() {
    if (readOnly) return
    if (tiene3) {
      onChange(value.slice(0, 2))
    } else {
      onChange([...value.slice(0, 2), { nombre: '', importe: 0 }])
    }
  }

  function handleImporte(index, raw) {
    if (readOnly) return
    const parsed = raw === '' ? 0 : Math.round((parseFloat(raw) || 0) * 100) / 100
    const next = value.map((d, i) => (i === index ? { ...d, importe: parsed } : d))
    onChange(next)
  }

  function handleNombre3(raw) {
    if (readOnly) return
    const next = value.map((d, i) => (i === 2 ? { ...d, nombre: raw } : d))
    onChange(next)
  }

  const totalDatafonos = Math.round(
    value.reduce((acc, d) => acc + (parseFloat(d.importe) || 0), 0) * 100
  ) / 100

  const inputBase =
    'border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 '
  const inputNormal = inputBase + 'bg-white border-gray-300'
  const inputDisabled = inputBase + 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Datáfonos</h3>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-gray-500">Añadir 3º datáfono</span>
          <button
            type="button"
            role="switch"
            aria-checked={tiene3}
            disabled={readOnly}
            onClick={handleToggle3}
            className={
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ' +
              (tiene3 ? 'bg-blue-600' : 'bg-gray-300') +
              (readOnly ? ' cursor-not-allowed opacity-60' : ' cursor-pointer')
            }
          >
            <span
              className={
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ' +
                (tiene3 ? 'translate-x-4' : 'translate-x-1')
              }
            />
          </button>
        </label>
      </div>

      <div className="space-y-2">
        {value.slice(0, tiene3 ? 3 : 2).map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            {i < 2 ? (
              <span className="flex-1 text-sm text-gray-700 truncate">
                {d.nombre || `Datáfono ${i + 1}`}
              </span>
            ) : (
              <input
                type="text"
                value={d.nombre}
                onChange={(e) => handleNombre3(e.target.value)}
                placeholder="Nombre datáfono"
                disabled={readOnly}
                className={
                  'flex-1 ' + (readOnly ? inputDisabled : inputNormal)
                }
              />
            )}
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.01"
                min="0"
                value={d.importe === 0 ? '' : d.importe}
                placeholder="0"
                disabled={readOnly}
                onChange={(e) => handleImporte(i, e.target.value)}
                className={
                  'w-32 text-right ' + (readOnly ? inputDisabled : inputNormal)
                }
              />
              <span className="text-xs text-gray-400">€</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm font-medium text-gray-700">Total datáfonos</span>
        <span className="text-sm font-semibold text-gray-900">{formatEuros(totalDatafonos)}</span>
      </div>
    </div>
  )
}
