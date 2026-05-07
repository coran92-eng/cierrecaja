import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTurno } from '../hooks/useTurno'
import AperturaForm from '../components/apertura/AperturaForm'
import CierreForm from '../components/cierre/CierreForm'
import { labelTurno } from '../lib/utils'

function LogoutButton() {
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Error al cerrar sesion:', err)
    }
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
    >
      Cerrar sesion
    </button>
  )
}

export default function Turno() {
  const perfil = useAuthStore((s) => s.perfil)
  const { registro, loading, error, refetch } = useTurno()

  const fechaFormateada = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })

  // El turno activo ES el último registro si está en marcha.
  // Si está cerrado (o no hay ninguno), hay que calcular el siguiente.
  const canApertura = !registro || ['cerrado', 'pendiente'].includes(registro?.estado)
  const canCierre = !!registro && ['apertura_ok', 'reabierto'].includes(registro?.estado)

  // Calcular la fecha del NUEVO turno a crear cuando canApertura=true
  let nuevaFecha = format(new Date(), 'yyyy-MM-dd')

  if (registro?.estado === 'cerrado') {
    if (registro.turno === 'manana') {
      nuevaFecha = registro.fecha
    } else {
      nuevaFecha = format(addDays(parseISO(registro.fecha), 1), 'yyyy-MM-dd')
    }
  }

  // Para mostrar el turno activo en el header
  const turnoMostrado = canCierre ? registro.turno : (registro?.estado === 'pendiente' ? registro.turno : null)

  // Estado de selección de turno y nombre (solo para apertura nueva)
  const [turnoElegido, setTurnoElegido] = useState(null)         // 'manana' | 'tarde'
  const [seleccionConfirmada, setSeleccionConfirmada] = useState(false)
  const [nombreEmpleado, setNombreEmpleado] = useState('')

  const [vistaActiva, setVistaActiva] = useState(null)

  // Inicializar y actualizar vistaActiva cuando cambia el estado del registro
  useEffect(() => {
    if (loading) return
    if (registro?.estado === 'apertura_ok' || registro?.estado === 'reabierto') {
      setVistaActiva('cierre')
    } else if (registro?.estado === 'cerrado') {
      setTurnoElegido(null)
      setNombreEmpleado('')
      setSeleccionConfirmada(false)
      setVistaActiva('apertura')
    } else if (canCierre) {
      setVistaActiva('cierre')
    } else if (canApertura) {
      setVistaActiva('apertura')
    }
  }, [registro?.estado, loading])

  // Pre-rellenar nombre desde perfil al montar o cuando cambia perfil
  useEffect(() => {
    if (perfil?.nombre && !nombreEmpleado) {
      setNombreEmpleado(perfil.nombre)
    }
  }, [perfil])

  // Resetear selección cuando se pulsa "Cambiar"
  function handleCambiarSeleccion() {
    setTurnoElegido(null)
    setSeleccionConfirmada(false)
  }

  // (limpieza de 'cerrado' gestionada en el useEffect principal de vistaActiva)

  // El turno y nombre efectivos para pasar al AperturaForm:
  // - Si hay apertura pendiente → usar datos del registro
  // - Si no → usar lo que eligió el usuario
  const turnoParaForm = registro?.estado === 'pendiente' ? registro.turno : turnoElegido
  const nombreParaForm = registro?.estado === 'pendiente' ? (registro.empleado_nombre ?? nombreEmpleado) : nombreEmpleado

  // Determinar si hay que mostrar la pantalla de selección
  const mostrarSeleccion =
    vistaActiva === 'apertura' &&
    canApertura &&
    registro?.estado !== 'pendiente' &&
    !seleccionConfirmada

  // Determinar si hay que mostrar el form de apertura
  const mostrarFormApertura =
    vistaActiva === 'apertura' &&
    canApertura &&
    (registro?.estado === 'pendiente' || seleccionConfirmada)

  // Nombre de cabecera: si hay cierre activo mostrar turno del registro; si hay selección mostrarla
  const turnoHeader = canCierre
    ? registro.turno
    : (registro?.estado === 'pendiente' ? registro.turno : turnoElegido)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Cierre de Caja</h1>
          {perfil?.nombre && (
            <p className="text-sm text-gray-500 mt-0.5">{perfil.nombre}</p>
          )}
        </div>
        <LogoutButton />
      </header>
      <div className="bg-white border-b border-gray-100 px-6 py-2">
        <p className="text-sm text-gray-500 capitalize">
          {turnoHeader ? `${labelTurno(turnoHeader)} — ` : ''}{fechaFormateada}
        </p>
      </div>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Selector de vista: dos cards grandes lado a lado */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => canApertura && setVistaActiva('apertura')}
            disabled={!canApertura}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              canApertura
                ? vistaActiva === 'apertura'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="text-2xl mb-2">🔓</div>
            <div className="font-semibold">Apertura de turno</div>
            <div className="text-sm mt-1 opacity-70">
              {canApertura ? 'Disponible' : 'Turno en curso'}
            </div>
          </button>

          <button
            onClick={() => canCierre && setVistaActiva('cierre')}
            disabled={!canCierre}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              canCierre
                ? vistaActiva === 'cierre'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-semibold">Cierre de turno</div>
            <div className="text-sm mt-1 opacity-70">
              {canCierre ? 'Turno abierto' : 'Sin turno activo'}
            </div>
          </button>
        </div>

        {/* Pantalla de selección de turno y nombre */}
        {mostrarSeleccion && (
          <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">¿Qué turno vas a hacer?</h2>

            {/* Botones de turno */}
            <div className="flex gap-3">
              {[
                { valor: 'manana', etiqueta: 'Turno 1' },
                { valor: 'tarde',  etiqueta: 'Turno 2' },
              ].map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  onClick={() => setTurnoElegido(valor)}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                    turnoElegido === valor
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            {/* Input de nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tu nombre
              </label>
              <input
                type="text"
                value={nombreEmpleado}
                onChange={(e) => setNombreEmpleado(e.target.value)}
                placeholder="Introduce tu nombre"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Botón confirmar */}
            <button
              onClick={() => {
                setSeleccionConfirmada(true)
                if (registro?.estado === 'apertura_ok' || registro?.estado === 'reabierto') {
                  setVistaActiva('cierre')
                }
              }}
              disabled={!turnoElegido || nombreEmpleado.trim() === ''}
              className="w-full inline-flex justify-center items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Formulario de apertura */}
        {mostrarFormApertura && (
          <div className="space-y-3">
            {vistaActiva === 'apertura' && seleccionConfirmada && registro?.estado === 'apertura_ok' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-medium text-sm">Apertura ya confirmada</p>
                  <p className="text-green-600 text-xs mt-0.5">{labelTurno(registro.turno)} — {registro.empleado_nombre}</p>
                </div>
                <button
                  onClick={() => setVistaActiva('cierre')}
                  className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Ir al cierre →
                </button>
              </div>
            ) : (
              <>
                {/* Badge de turno y nombre + botón Cambiar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {labelTurno(turnoParaForm)}
                    </span>
                    {nombreParaForm && (
                      <span className="text-sm text-gray-600">{nombreParaForm}</span>
                    )}
                  </div>
                  {registro?.estado !== 'apertura_ok' && registro?.estado !== 'cerrado' && registro?.estado !== 'reabierto' && (
                    <button
                      onClick={handleCambiarSeleccion}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
                <AperturaForm
                  registro={registro?.estado === 'pendiente' ? registro : null}
                  loading={loading}
                  error={error}
                  refetch={refetch}
                  turnoActual={turnoParaForm}
                  fechaHoy={nuevaFecha}
                  nombreEmpleado={nombreParaForm}
                />
              </>
            )}
          </div>
        )}

        {/* Formulario de cierre */}
        {vistaActiva === 'cierre' && canCierre && (
          <CierreForm
            registro={registro}
            loading={loading}
            refetch={refetch}
          />
        )}
      </main>
    </div>
  )
}
