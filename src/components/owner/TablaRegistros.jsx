import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import Badge from '../ui/Badge'
import ModalDetalle from './ModalDetalle'

function formatEuro(valor) {
  if (valor === null || valor === undefined) return '—'
  const rounded = Math.round(valor * 100) / 100
  return `€${rounded.toFixed(2)}`
}

function formatEuroSigned(valor) {
  if (valor === null || valor === undefined) return '—'
  const rounded = Math.round(valor * 100) / 100
  const abs = Math.abs(rounded).toFixed(2)
  if (rounded === 0) return '€0.00'
  return rounded < 0 ? `-€${abs}` : `€${abs}`
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  try {
    return format(parseISO(fecha), 'dd/MM/yyyy', { locale: es })
  } catch {
    return fecha
  }
}

function turnoLabel(turno) {
  if (turno === 'manana') return 'Mañana'
  if (turno === 'tarde') return 'Tarde'
  return turno ?? '—'
}

function celdasDifEfectivo(valor) {
  if (valor === null || valor === undefined) {
    return { bg: '', text: '—' }
  }
  const abs = Math.abs(Math.round(valor * 100) / 100)
  let bg = 'bg-green-50'
  if (abs > 10) bg = 'bg-red-50'
  else if (abs > 0) bg = 'bg-amber-50'
  return { bg, text: formatEuroSigned(valor) }
}

function celdasDifTarjeta(valor) {
  if (valor === null || valor === undefined) {
    return { bg: '', text: '—' }
  }
  const abs = Math.abs(Math.round(valor * 100) / 100)
  let bg = 'bg-green-50'
  if (abs > 5) bg = 'bg-red-50'
  else if (abs > 0) bg = 'bg-amber-50'
  return { bg, text: formatEuroSigned(valor) }
}

function textColorDifApertura(valor) {
  if (valor === null || valor === undefined) return 'text-gray-400'
  const abs = Math.abs(Math.round(valor * 100) / 100)
  return abs === 0 ? 'text-green-700' : 'text-red-700'
}

function SemaforoDot({ semaforo }) {
  const colores = {
    verde: 'bg-green-500',
    naranja: 'bg-amber-400',
    rojo: 'bg-red-500',
  }
  const etiquetas = {
    verde: 'Verde',
    naranja: 'Naranja',
    rojo: 'Rojo',
  }
  if (!semaforo) return <span className="text-gray-400">—</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colores[semaforo] ?? 'bg-gray-400'}`} />
      <span className="text-sm text-gray-700">{etiquetas[semaforo] ?? semaforo}</span>
    </div>
  )
}

function estadoBadge(estado) {
  const map = {
    apertura_ok: { variant: 'info', label: 'Apertura ok' },
    cerrado: { variant: 'success', label: 'Cerrado' },
    reabierto: { variant: 'warning', label: 'Reabierto' },
    pendiente: { variant: 'neutral', label: 'Pendiente' },
  }
  const cfg = map[estado] ?? { variant: 'neutral', label: estado ?? '—' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

export default function TablaRegistros({ registros = [], onReabrir }) {
  const [detalleRegistro, setDetalleRegistro] = useState(null)

  if (registros.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
        <p className="text-gray-500 text-sm">No hay registros para los filtros seleccionados</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Fecha</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Turno</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Empleado</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Apertura</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Dif. apertura</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Efectivo neto</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Dif. efectivo</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Dif. tarjeta</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Semáforo</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Estado</th>
              <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {registros.map((reg) => {
              const difEf = celdasDifEfectivo(reg.cierre_dif_efectivo)
              const difTa = celdasDifTarjeta(reg.cierre_dif_tarjeta)
              const colorApertura = textColorDifApertura(reg.apertura_diferencia)

              return (
                <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatFecha(reg.fecha)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {turnoLabel(reg.turno)}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                    {reg.empleado_nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600">
                    {reg.apertura_total_contado !== null && reg.apertura_total_contado !== undefined
                      ? formatEuro(reg.apertura_total_contado)
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${colorApertura}`}>
                    {reg.apertura_diferencia !== null && reg.apertura_diferencia !== undefined
                      ? formatEuroSigned(reg.apertura_diferencia)
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
                    {formatEuro(reg.cierre_efectivo_neto)}
                  </td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${difEf.bg}`}>
                    <span>{difEf.text}</span>
                  </td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${difTa.bg}`}>
                    <span>{difTa.text}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SemaforoDot semaforo={reg.cierre_semaforo} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {estadoBadge(reg.estado)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetalleRegistro(reg)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Ver detalle
                      </button>
                      {reg.estado === 'cerrado' && (
                        <button
                          onClick={() => onReabrir(reg)}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ModalDetalle registro={detalleRegistro} onClose={() => setDetalleRegistro(null)} />
    </div>
  )
}
