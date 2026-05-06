import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import { crearApertura, confirmarApertura, obtenerFondoAnterior } from '../../hooks/useTurno'
import DesgloseDenominaciones, { calcularTotal, DESGLOSE_VACIO } from '../ui/DesgloseDenominaciones'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import { useToast } from '../ui/Toast'

function formatEuros(valor) {
  return Number(valor ?? 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €'
}

function formatFecha(fechaStr) {
  try {
    // fechaStr es 'yyyy-MM-dd'
    const [anio, mes, dia] = fechaStr.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    return format(fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return fechaStr
  }
}

function labelTurno(turno) {
  return turno === 'manana' ? 'Mañana' : 'Tarde'
}

export default function AperturaForm({ registro, loading, error, refetch, turnoActual, fechaHoy }) {
  const user = useAuthStore((s) => s.user)
  const perfil = useAuthStore((s) => s.perfil)
  const { addToast } = useToast()

  // Estado del fondo heredado del turno anterior
  const [fondoInfo, setFondoInfo] = useState(null)
  const [fondoLoading, setFondoLoading] = useState(true)
  const [fondoError, setFondoError] = useState(null)

  // Estado local del formulario de apertura
  const [fondoEditable, setFondoEditable] = useState('')
  const [desglose, setDesglose] = useState({ ...DESGLOSE_VACIO })

  // Estado de operaciones asíncronas
  const [iniciando, setIniciando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [opError, setOpError] = useState(null)

  // Cargar fondo anterior al montar
  useEffect(() => {
    async function cargar() {
      setFondoLoading(true)
      setFondoError(null)
      try {
        const resultado = await obtenerFondoAnterior(turnoActual, fechaHoy)
        setFondoInfo(resultado)
      } catch (err) {
        console.error('AperturaForm: error al obtener fondo anterior', err)
        setFondoError(err)
      } finally {
        setFondoLoading(false)
      }
    }
    cargar()
  }, [turnoActual, fechaHoy])

  // Inicializar fondoEditable cuando el registro pase a pendiente con fondo editable
  useEffect(() => {
    if (registro?.apertura_fondo_editable && registro?.apertura_fondo_heredado == null) {
      setFondoEditable('')
    } else if (registro?.apertura_fondo_heredado != null) {
      setFondoEditable(String(registro.apertura_fondo_heredado))
    }
  }, [registro])

  // ---- Handlers ----

  async function handleIniciarApertura() {
    if (!user || !perfil) return
    setIniciando(true)
    setOpError(null)
    try {
      const esEditable = !fondoInfo?.encontrado || fondoInfo?.fondo == null
      await crearApertura({
        turnoNombre: turnoActual,
        fecha: fechaHoy,
        empleadoId: user.id,
        empleadoNombre: perfil?.nombre ?? user.email,
        fondoHeredado: fondoInfo?.fondo ?? null,
        fondoEditable: esEditable,
      })
      await refetch()
    } catch (err) {
      console.error('handleIniciarApertura:', err)
      setOpError('No se pudo iniciar la apertura. Inténtalo de nuevo.')
    } finally {
      setIniciando(false)
    }
  }

  async function handleConfirmarApertura() {
    if (!registro) return
    setConfirmando(true)
    setOpError(null)
    try {
      const fondo = registro.apertura_fondo_editable
        ? parseFloat(fondoEditable) || 0
        : (registro.apertura_fondo_heredado ?? 0)

      const totalContado = calcularTotal(desglose)
      const diferencia = Math.round((totalContado - fondo) * 100) / 100

      await confirmarApertura({
        id: registro.id,
        desglose,
        totalContado,
        diferencia,
      })
      await refetch()
      addToast({ message: 'Apertura confirmada', type: 'success' })
    } catch (err) {
      console.error('handleConfirmarApertura:', err)
      setOpError('No se pudo confirmar la apertura. Inténtalo de nuevo.')
      addToast({ message: err.message || 'Error al confirmar', type: 'error' })
    } finally {
      setConfirmando(false)
    }
  }

  // ---- Cálculos derivados para el formulario pendiente ----

  const fondoBase = registro?.apertura_fondo_editable
    ? parseFloat(fondoEditable) || 0
    : (registro?.apertura_fondo_heredado ?? 0)

  const totalContado = calcularTotal(desglose)
  const diferencia = Math.round((totalContado - fondoBase) * 100) / 100

  const desgloseVacio = Object.values(desglose).every((v) => v === 0)
  const fondoEditableVacio = registro?.apertura_fondo_editable && fondoEditable.trim() === ''
  const confirmarDeshabilitado = desgloseVacio || fondoEditableVacio || confirmando

  // ---- Render guards ----

  if (loading || fondoLoading) {
    return (
      <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 flex justify-center items-center min-h-32">
        <Spinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl shadow-sm border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">Error al cargar el turno: {error.message}</p>
      </div>
    )
  }

  // Alerta: turno anterior existe pero no está cerrado
  const mostrarAlertaTurnoAbierto =
    fondoInfo?.encontrado && !fondoInfo?.turnoAnteriorCerrado

  // ---- Render ----

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 space-y-5">
      {/* Cabecera */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          Apertura — Turno {labelTurno(turnoActual)}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatFecha(fechaHoy)}</p>
      </div>

      <hr className="border-gray-100" />

      {/* Alerta turno anterior no cerrado */}
      {mostrarAlertaTurnoAbierto && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            El turno anterior aun no esta cerrado. Pide al encargado que lo cierre.
          </p>
        </div>
      )}

      {/* Error de operacion */}
      {opError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{opError}</p>
        </div>
      )}

      {/* Estado: sin registro — mostrar boton para iniciar */}
      {!registro && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-gray-600">
            No hay apertura registrada para este turno.
          </p>
          <button
            onClick={handleIniciarApertura}
            disabled={iniciando || mostrarAlertaTurnoAbierto}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {iniciando && <Spinner size="sm" />}
            Iniciar apertura
          </button>
        </div>
      )}

      {/* Estado: pendiente — formulario editable */}
      {registro?.estado === 'pendiente' && (
        <div className="space-y-5">
          {/* Fondo heredado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fondo heredado del turno anterior
            </label>
            {registro.apertura_fondo_editable ? (
              <input
                type="number"
                min={0}
                step={0.01}
                value={fondoEditable}
                onChange={(e) => setFondoEditable(e.target.value)}
                placeholder="0,00"
                className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <div className="inline-flex items-center gap-1 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span>{formatEuros(registro.apertura_fondo_heredado)}</span>
                <span className="text-xs text-gray-400 ml-1">(heredado)</span>
              </div>
            )}
            {registro.apertura_fondo_editable && (
              <p className="text-xs text-gray-400 mt-1">
                No se encontro fondo del turno anterior. Introduce el fondo de caja inicial.
              </p>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Desglose de denominaciones */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Conteo del efectivo en caja</p>
            <DesgloseDenominaciones
              value={desglose}
              onChange={setDesglose}
              readOnly={false}
              referencia={fondoBase > 0 ? fondoBase : null}
            />
          </div>

          <hr className="border-gray-100" />

          {/* Diferencia en tiempo real */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Diferencia</span>
            <span
              className={`text-sm font-semibold ${
                diferencia === 0
                  ? 'text-green-600'
                  : diferencia > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {diferencia === 0
                ? 'Cuadrado ✓'
                : diferencia > 0
                ? `Sobran ${formatEuros(diferencia)}`
                : `Faltan ${formatEuros(Math.abs(diferencia))}`}
            </span>
          </div>

          {/* Boton confirmar */}
          <button
            onClick={handleConfirmarApertura}
            disabled={confirmarDeshabilitado}
            className="w-full inline-flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {confirmando && <Spinner size="sm" />}
            Confirmar apertura
          </button>
        </div>
      )}

      {/* Estado: apertura confirmada o superior — resumen readonly */}
      {registro && ['apertura_ok', 'cerrado', 'reabierto'].includes(registro.estado) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estado</span>
            <Badge variant="success">Apertura confirmada</Badge>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fondo heredado</span>
              <span className="font-medium text-gray-800">
                {formatEuros(registro.apertura_fondo_heredado)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total contado</span>
              <span className="font-medium text-gray-800">
                {formatEuros(registro.apertura_total_contado)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Diferencia</span>
              <span
                className={`font-semibold ${
                  registro.apertura_diferencia === 0
                    ? 'text-green-600'
                    : registro.apertura_diferencia > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {registro.apertura_diferencia === 0
                  ? 'Cuadrado ✓'
                  : registro.apertura_diferencia > 0
                  ? `Sobran ${formatEuros(registro.apertura_diferencia)}`
                  : `Faltan ${formatEuros(Math.abs(registro.apertura_diferencia))}`}
              </span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Desglose de apertura en modo lectura */}
          {registro.apertura_desglose && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Desglose de apertura</p>
              <DesgloseDenominaciones
                value={registro.apertura_desglose}
                readOnly
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
