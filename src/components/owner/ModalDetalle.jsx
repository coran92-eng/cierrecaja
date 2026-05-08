import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import DesgloseDenominaciones, { DESGLOSE_VACIO } from '../ui/DesgloseDenominaciones'
import Semaforo from '../ui/Semaforo'
import Badge from '../ui/Badge'

function fmt(valor) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtSigned(valor) {
  if (valor === null || valor === undefined) return '—'
  const v = Math.round(valor * 100) / 100
  if (v === 0) return '0,00 € ✓'
  const abs = Math.abs(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return v > 0 ? `+${abs} €` : `-${abs} €`
}

function fmtFecha(fecha) {
  if (!fecha) return '—'
  try { return format(parseISO(fecha), "d 'de' MMMM yyyy", { locale: es }) } catch { return fecha }
}

function Row({ label, value, valueClass = 'text-gray-800' }) {
  return (
    <div className="flex justify-between items-baseline text-sm py-1">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

function Section({ titulo, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</h3>
      {children}
    </div>
  )
}

export default function ModalDetalle({ registro, onClose }) {
  const [datafonos, setDatafonos] = useState([])

  useEffect(() => {
    if (!registro?.id) return
    setDatafonos([])
    supabase
      .from('datafonos_cierre')
      .select('nombre, importe, orden')
      .eq('registro_id', registro.id)
      .order('orden')
      .then(({ data }) => setDatafonos(data ?? []))
  }, [registro?.id])

  if (!registro) return null

  const turnoLabel = registro.turno === 'manana' ? 'Turno 1 (Mañana)' : 'Turno 2 (Tarde)'
  const estadoMap = {
    pendiente: { variant: 'neutral', label: 'Pendiente' },
    apertura_ok: { variant: 'info', label: 'Apertura ok' },
    cerrado: { variant: 'success', label: 'Cerrado' },
    reabierto: { variant: 'warning', label: 'Reabierto' },
  }
  const estadoCfg = estadoMap[registro.estado] ?? { variant: 'neutral', label: registro.estado }

  const tieneCierre = ['cerrado', 'reabierto'].includes(registro.estado) || registro.cierre_total_caja !== null
  const totalDatafonos = datafonos.reduce((acc, d) => acc + (parseFloat(d.importe) || 0), 0)

  const difEf = registro.cierre_dif_efectivo ?? 0
  const difTa = registro.cierre_dif_tarjeta ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{turnoLabel}</p>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">{fmtFecha(registro.fecha)}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{registro.empleado_nombre ?? '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={estadoCfg.variant}>{estadoCfg.label}</Badge>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* APERTURA */}
          <Section titulo="Apertura">
            <Row
              label="Fondo heredado"
              value={fmt(registro.apertura_fondo_heredado)}
            />
            {registro.apertura_desglose && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Desglose contado</p>
                <DesgloseDenominaciones
                  value={registro.apertura_desglose ?? DESGLOSE_VACIO}
                  readOnly
                />
              </div>
            )}
            <Row label="Total contado" value={fmt(registro.apertura_total_contado)} />
            <Row
              label="Diferencia"
              value={fmtSigned(registro.apertura_diferencia)}
              valueClass={
                registro.apertura_diferencia === 0 ? 'text-green-600' :
                registro.apertura_diferencia > 0 ? 'text-green-600' : 'text-red-600'
              }
            />
          </Section>

          {tieneCierre && (
            <>
              <hr className="border-gray-100" />

              {/* CIERRE — Cajón */}
              <Section titulo="Cierre — Cajón">
                {registro.cierre_desglose && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-400 mb-1">Desglose cajón</p>
                    <DesgloseDenominaciones
                      value={registro.cierre_desglose ?? DESGLOSE_VACIO}
                      readOnly
                    />
                  </div>
                )}
                <Row label="Total cajón" value={fmt(registro.cierre_total_caja)} />
                <Row label="Fondo dejado" value={fmt(registro.cierre_fondo_definido)} />
                <Row label="Efectivo neto" value={fmt(registro.cierre_efectivo_neto)} />

                {/* Mensaje sobre */}
                {registro.cierre_efectivo_neto !== null && (
                  <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3">
                    <p className="text-xs font-medium text-indigo-500 uppercase tracking-wide mb-0.5">Sobre</p>
                    <p className="text-sm font-semibold text-indigo-800">
                      La cantidad a introducir en el sobre es de{' '}
                      <span className="text-base">{fmt(registro.cierre_efectivo_neto)}</span>
                    </p>
                  </div>
                )}
              </Section>

              <hr className="border-gray-100" />

              {/* CIERRE — Datáfonos y TPV */}
              <Section titulo="Datáfonos y TPV">
                {datafonos.map((d, i) => (
                  <Row key={i} label={d.nombre} value={fmt(d.importe)} />
                ))}
                {datafonos.length > 0 && (
                  <Row label="Total datáfonos" value={fmt(totalDatafonos)} />
                )}
                <div className="mt-1 pt-1 border-t border-gray-100">
                  <Row label="TPV efectivo" value={fmt(registro.cierre_tpv_efectivo)} />
                  <Row label="TPV tarjeta" value={fmt(registro.cierre_tpv_tarjeta)} />
                  <Row label="Voids" value={registro.cierre_tpv_voids ?? '—'} />
                  {registro.cierre_num_tickets !== null && (
                    <Row label="Nº tickets" value={registro.cierre_num_tickets} />
                  )}
                </div>
              </Section>

              <hr className="border-gray-100" />

              {/* RESULTADO */}
              <Section titulo="Resultado">
                <Row
                  label="Diferencia efectivo"
                  value={fmtSigned(registro.cierre_dif_efectivo)}
                  valueClass={difEf === 0 ? 'text-green-600' : difEf > 0 ? 'text-green-600' : 'text-red-600'}
                />
                <Row
                  label="Diferencia tarjeta"
                  value={fmtSigned(registro.cierre_dif_tarjeta)}
                  valueClass={difTa === 0 ? 'text-green-600' : difTa > 0 ? 'text-green-600' : 'text-red-600'}
                />
                <div className="pt-1">
                  <Semaforo difEfectivo={difEf} difTarjeta={difTa} mostrarDetalle />
                </div>
              </Section>
            </>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
