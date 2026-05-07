import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { guardarCierre, obtenerDatafonos } from '../../hooks/useCierre'
import DesgloseDenominaciones, { calcularTotal, DESGLOSE_VACIO } from '../ui/DesgloseDenominaciones'
import Semaforo from '../ui/Semaforo'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import DatafonoPanel from './DatafonoPanel'
import { useToast } from '../ui/Toast'
import ModalConfirmar from '../ui/ModalConfirmar'

const schema = z.object({
  fondoDefinido: z.number({ required_error: 'Requerido' }).min(0),
  tpvEfectivo: z.number({ required_error: 'Requerido' }).min(0),
  tpvTarjeta: z.number({ required_error: 'Requerido' }).min(0),
  tpvVoids: z.number({ required_error: 'Requerido' }).min(0),
  numTickets: z.number().int().min(0).optional(),
})

const DATAFONOS_INICIAL = [
  { nombre: 'Datáfono 1', importe: 0 },
  { nombre: 'Datáfono 2', importe: 0 },
]

function formatEuros(valor) {
  return Number(valor ?? 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

function calcularDiferencias({ totalCaja, fondoDefinido, tpvEfectivo, tpvTarjeta, datafonos }) {
  const efectivoNeto = Math.round((totalCaja - fondoDefinido) * 100) / 100
  const totalDatafonos = Math.round(
    datafonos.reduce((acc, d) => acc + (parseFloat(d.importe) || 0), 0) * 100
  ) / 100
  const difEfectivo = Math.round((efectivoNeto - tpvEfectivo) * 100) / 100
  const difTarjeta = Math.round((totalDatafonos - tpvTarjeta) * 100) / 100
  return { efectivoNeto, totalDatafonos, difEfectivo, difTarjeta }
}

// --- Vista resumen readonly cuando el cierre ya está confirmado ---
function ResumenCierre({ registro, datafonos }) {
  const totalDatafonos = Math.round(
    datafonos.reduce((acc, d) => acc + (parseFloat(d.importe) || 0), 0) * 100
  ) / 100

  const varianteSemaforo = {
    verde: 'success',
    naranja: 'warning',
    rojo: 'error',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Estado</span>
        <Badge variant="success">Cierre confirmado</Badge>
      </div>

      <hr className="border-gray-100" />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Desglose de cajón</p>
        <DesgloseDenominaciones value={registro.cierre_desglose ?? DESGLOSE_VACIO} readOnly />
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total cajón</span>
          <span className="font-medium">{formatEuros(registro.cierre_total_caja)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fondo dejado</span>
          <span className="font-medium">{formatEuros(registro.cierre_fondo_definido)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Efectivo neto</span>
          <span className="font-medium">{formatEuros(registro.cierre_efectivo_neto)}</span>
        </div>
      </div>

      <hr className="border-gray-100" />

      <DatafonoPanel value={datafonos} readOnly />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Total datáfonos</span>
          <span className="font-medium">{formatEuros(totalDatafonos)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Efectivo TPV</span>
          <span className="font-medium">{formatEuros(registro.cierre_tpv_efectivo)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Tarjeta TPV</span>
          <span className="font-medium">{formatEuros(registro.cierre_tpv_tarjeta)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Voids</span>
          <span className="font-medium">{registro.cierre_tpv_voids ?? 0}</span>
        </div>
        {registro.cierre_num_tickets != null && (
          <div className="flex justify-between">
            <span className="text-gray-600">Nº tickets</span>
            <span className="font-medium">{registro.cierre_num_tickets}</span>
          </div>
        )}
      </div>

      <hr className="border-gray-100" />

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Resultado</p>
        <Semaforo
          difEfectivo={registro.cierre_dif_efectivo ?? 0}
          difTarjeta={registro.cierre_dif_tarjeta ?? 0}
          mostrarDetalle
        />
      </div>
    </div>
  )
}

export default function CierreForm({ registro, refetch }) {
  const { addToast } = useToast()

  const [desglose, setDesglose] = useState({ ...DESGLOSE_VACIO })
  const [datafonos, setDatafonos] = useState(DATAFONOS_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [opError, setOpError] = useState(null)
  const [datafonosCargados, setDatafonosCargados] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fondoDefinido: undefined,
      tpvEfectivo: undefined,
      tpvTarjeta: undefined,
      tpvVoids: undefined,
      numTickets: undefined,
    },
  })

  // Cargar datáfonos cuando el registro ya está cerrado
  useEffect(() => {
    if (registro?.estado === 'cerrado' && registro?.id) {
      obtenerDatafonos(registro.id)
        .then((rows) => setDatafonosCargados(rows.map((r) => ({ nombre: r.nombre, importe: r.importe }))))
        .catch((err) => console.error('CierreForm: error al cargar datáfonos', err))
    }
  }, [registro?.id, registro?.estado])

  // No renderizar si no hay registro o no está en estado apertura_ok / cerrado
  if (!registro) return null
  if (!['apertura_ok', 'cerrado'].includes(registro.estado)) return null

  // Vista readonly si ya está cerrado
  if (registro.estado === 'cerrado') {
    return (
      <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cierre de turno</h2>
        </div>
        <hr className="border-gray-100" />
        <ResumenCierre registro={registro} datafonos={datafonosCargados} />
      </div>
    )
  }

  // Valores observados en tiempo real para el resumen de diferencias
  const fondoDefinidoWatch = watch('fondoDefinido') ?? 0
  const tpvEfectivoWatch = watch('tpvEfectivo') ?? 0
  const tpvTarjetaWatch = watch('tpvTarjeta') ?? 0

  const totalCaja = calcularTotal(desglose)
  const desgloseVacio = Object.values(desglose).every((v) => v === 0)

  const { efectivoNeto, totalDatafonos, difEfectivo, difTarjeta } = calcularDiferencias({
    totalCaja,
    fondoDefinido: isNaN(fondoDefinidoWatch) ? 0 : fondoDefinidoWatch,
    tpvEfectivo: isNaN(tpvEfectivoWatch) ? 0 : tpvEfectivoWatch,
    tpvTarjeta: isNaN(tpvTarjetaWatch) ? 0 : tpvTarjetaWatch,
    datafonos,
  })

  async function ejecutarGuardarCierre(formData) {
    setModalOpen(false)
    setGuardando(true)
    setOpError(null)
    try {
      const { error } = await guardarCierre({
        registroId: registro.id,
        desglose,
        totalCaja,
        fondoDefinido: formData.fondoDefinido,
        tpvEfectivo: formData.tpvEfectivo,
        tpvTarjeta: formData.tpvTarjeta,
        tpvVoids: formData.tpvVoids,
        numTickets: formData.numTickets ?? null,
        datafonos,
      })
      if (error) throw error
      await refetch()
      addToast({ message: 'Cierre guardado correctamente', type: 'success' })
    } catch (err) {
      console.error('CierreForm: error al guardar cierre', err)
      setOpError('No se pudo guardar el cierre. Inténtalo de nuevo.')
      addToast({ message: err.message || 'Error al guardar cierre', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  function onSubmit(formData) {
    if (desgloseVacio) return
    const hayDiferencias = difEfectivo !== 0 || difTarjeta !== 0
    if (hayDiferencias) {
      setPendingData(formData)
      setModalOpen(true)
    } else {
      ejecutarGuardarCierre(formData)
    }
  }

  const inputBase =
    'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 border-gray-300 bg-white'
  const inputError = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 border-red-400 bg-white'

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Cierre de turno</h2>
      </div>

      <hr className="border-gray-100" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

        {/* A) Desglose de cajón */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Desglose de cajón
          </h3>
          <DesgloseDenominaciones value={desglose} onChange={setDesglose} readOnly={false} />

          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fondo que dejas
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={errors.fondoDefinido ? inputError : inputBase}
                {...register('fondoDefinido', { valueAsNumber: true })}
              />
              {errors.fondoDefinido && (
                <p className="text-xs text-red-600 mt-1">{errors.fondoDefinido.message}</p>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-end">
              <p className="text-xs text-gray-500 mb-1">Efectivo neto</p>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-right">
                {formatEuros(efectivoNeto)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                cajón {formatEuros(totalCaja)} − fondo {formatEuros(isNaN(fondoDefinidoWatch) ? 0 : fondoDefinidoWatch)}
              </p>
            </div>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* B) Datáfonos */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Datáfonos
          </h3>
          <DatafonoPanel value={datafonos} onChange={setDatafonos} readOnly={false} />
        </section>

        <hr className="border-gray-100" />

        {/* C) Datos TPV */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Datos TPV
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Efectivo TPV
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={errors.tpvEfectivo ? inputError : inputBase}
                {...register('tpvEfectivo', { valueAsNumber: true })}
              />
              {errors.tpvEfectivo && (
                <p className="text-xs text-red-600 mt-1">{errors.tpvEfectivo.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarjeta TPV
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={errors.tpvTarjeta ? inputError : inputBase}
                {...register('tpvTarjeta', { valueAsNumber: true })}
              />
              {errors.tpvTarjeta && (
                <p className="text-xs text-red-600 mt-1">{errors.tpvTarjeta.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voids
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                className={errors.tpvVoids ? inputError : inputBase}
                {...register('tpvVoids', { valueAsNumber: true })}
              />
              {errors.tpvVoids && (
                <p className="text-xs text-red-600 mt-1">{errors.tpvVoids.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº tickets <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                className={inputBase}
                {...register('numTickets', { valueAsNumber: true })}
              />
            </div>
          </div>
        </section>

        <hr className="border-gray-100" />

        {/* D) Resumen de diferencias */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Resumen de diferencias
          </h3>

          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-xs text-gray-600">
            <p>
              <span className="font-medium">Efectivo:</span>{' '}
              cajón {formatEuros(totalCaja)} − fondo {formatEuros(isNaN(fondoDefinidoWatch) ? 0 : fondoDefinidoWatch)} − TPV {formatEuros(isNaN(tpvEfectivoWatch) ? 0 : tpvEfectivoWatch)}{' '}
              = <span className="font-semibold text-gray-800">{formatEuros(difEfectivo)}</span>
            </p>
            <p>
              <span className="font-medium">Tarjeta:</span>{' '}
              datáfonos {formatEuros(totalDatafonos)} − TPV {formatEuros(isNaN(tpvTarjetaWatch) ? 0 : tpvTarjetaWatch)}{' '}
              = <span className="font-semibold text-gray-800">{formatEuros(difTarjeta)}</span>
            </p>
          </div>

          <Semaforo difEfectivo={difEfectivo} difTarjeta={difTarjeta} mostrarDetalle />
        </section>

        <hr className="border-gray-100" />

        {/* Error de operación */}
        {opError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{opError}</p>
          </div>
        )}

        {/* E) Botón confirmar */}
        <button
          type="submit"
          disabled={guardando || desgloseVacio}
          className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          {guardando && <Spinner size="sm" />}
          Confirmar cierre
        </button>

        {desgloseVacio && (
          <p className="text-xs text-center text-gray-400">
            Rellena el desglose de cajón para continuar.
          </p>
        )}
      </form>

      {(() => {
        const warnings = []
        if (difEfectivo !== 0)
          warnings.push(difEfectivo > 0
            ? `Sobran ${formatEuros(difEfectivo)} en efectivo.`
            : `Faltan ${formatEuros(Math.abs(difEfectivo))} en efectivo.`)
        if (difTarjeta !== 0)
          warnings.push(difTarjeta > 0
            ? `Sobran ${formatEuros(difTarjeta)} en tarjeta (datáfonos vs TPV).`
            : `Faltan ${formatEuros(Math.abs(difTarjeta))} en tarjeta (datáfonos vs TPV).`)
        return (
          <ModalConfirmar
            open={modalOpen}
            titulo="Diferencias en el cierre"
            warnings={warnings}
            confirmando={guardando}
            onCancel={() => { setModalOpen(false); setPendingData(null) }}
            onConfirm={() => ejecutarGuardarCierre(pendingData)}
          />
        )
      })()}
    </div>
  )
}
