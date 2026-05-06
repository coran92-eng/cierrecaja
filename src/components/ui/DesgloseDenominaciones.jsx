import { useMemo } from 'react'

export function calcularTotal(desglose) {
  if (!desglose) return 0
  const {
    b500 = 0, b200 = 0, b100 = 0, b50 = 0, b20 = 0, b10 = 0, b5 = 0,
    c200 = 0, c100 = 0, c050 = 0, c020 = 0, c010 = 0, c005 = 0, c002 = 0, c001 = 0,
  } = desglose
  const total =
    b500 * 500 + b200 * 200 + b100 * 100 + b50 * 50 + b20 * 20 + b10 * 10 + b5 * 5 +
    c200 * 2 + c100 * 1 + c050 * 0.5 + c020 * 0.2 + c010 * 0.1 + c005 * 0.05 +
    c002 * 0.02 + c001 * 0.01
  return Math.round(total * 100) / 100
}

export const DESGLOSE_VACIO = {
  b500: 0, b200: 0, b100: 0, b50: 0, b20: 0, b10: 0, b5: 0,
  c200: 0, c100: 0, c050: 0, c020: 0, c010: 0, c005: 0, c002: 0, c001: 0,
}

const BILLETES = [
  { clave: 'b500', etiqueta: '500 €', valor: 500 },
  { clave: 'b200', etiqueta: '200 €', valor: 200 },
  { clave: 'b100', etiqueta: '100 €', valor: 100 },
  { clave: 'b50',  etiqueta: '50 €',  valor: 50 },
  { clave: 'b20',  etiqueta: '20 €',  valor: 20 },
  { clave: 'b10',  etiqueta: '10 €',  valor: 10 },
  { clave: 'b5',   etiqueta: '5 €',   valor: 5 },
]

const MONEDAS = [
  { clave: 'c200', etiqueta: '2,00 €',  valor: 2 },
  { clave: 'c100', etiqueta: '1,00 €',  valor: 1 },
  { clave: 'c050', etiqueta: '0,50 €',  valor: 0.5 },
  { clave: 'c020', etiqueta: '0,20 €',  valor: 0.2 },
  { clave: 'c010', etiqueta: '0,10 €',  valor: 0.1 },
  { clave: 'c005', etiqueta: '0,05 €',  valor: 0.05 },
  { clave: 'c002', etiqueta: '0,02 €',  valor: 0.02 },
  { clave: 'c001', etiqueta: '0,01 €',  valor: 0.01 },
]

function FilaDenominacion({ etiqueta, clave, valor, cantidad, onChange, readOnly }) {
  const parcial = Math.round(cantidad * valor * 100) / 100

  function handleChange(e) {
    const raw = e.target.value
    const parsed = raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0)
    onChange(clave, parsed)
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-16 sm:w-20 text-sm text-gray-600 text-right shrink-0">{etiqueta}</span>
      <span className="text-gray-400 text-xs shrink-0">×</span>
      <input
        type="number"
        min={0}
        step={1}
        value={cantidad === 0 ? '' : cantidad}
        placeholder="0"
        disabled={readOnly}
        onChange={handleChange}
        className={
          'w-16 sm:w-20 text-right border rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] ' +
          (readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300')
        }
      />
      <span className="text-gray-400 text-xs shrink-0">=</span>
      <span className="flex-1 text-sm text-gray-700 text-right">
        {parcial.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </span>
    </div>
  )
}

function SeccionDenominaciones({ titulo, items, value, onChange, readOnly }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 border-b border-gray-100 pb-1">
        {titulo}
      </h3>
      {items.map(({ clave, etiqueta, valor }) => (
        <FilaDenominacion
          key={clave}
          clave={clave}
          etiqueta={etiqueta}
          valor={valor}
          cantidad={value[clave] ?? 0}
          onChange={onChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}

export default function DesgloseDenominaciones({
  value = DESGLOSE_VACIO,
  onChange,
  readOnly = false,
  referencia = null,
}) {
  const merged = { ...DESGLOSE_VACIO, ...value }

  const total = useMemo(() => calcularTotal(merged), [merged])

  const totalColor = useMemo(() => {
    if (referencia === null) return 'text-gray-800'
    const diff = Math.abs(Math.round((total - referencia) * 100))
    return diff === 0 ? 'text-green-600' : 'text-amber-500'
  }, [total, referencia])

  function handleChange(clave, cantidad) {
    if (readOnly || !onChange) return
    onChange({ ...merged, [clave]: cantidad })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <SeccionDenominaciones
        titulo="Billetes"
        items={BILLETES}
        value={merged}
        onChange={handleChange}
        readOnly={readOnly}
      />
      <SeccionDenominaciones
        titulo="Monedas"
        items={MONEDAS}
        value={merged}
        onChange={handleChange}
        readOnly={readOnly}
      />
      <div className="flex items-center gap-3 pt-2 border-t border-gray-200 mt-2">
        <span className="w-20 text-sm font-bold text-gray-800 text-right shrink-0">Total</span>
        <span className="flex-1" />
        <span className={`w-24 text-sm font-bold text-right ${totalColor}`}>
          {total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </span>
      </div>
      {referencia !== null && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">
            Referencia: {Number(referencia).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
      )}
    </div>
  )
}
