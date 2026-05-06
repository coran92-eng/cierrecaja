import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTurno } from '../hooks/useTurno'
import AperturaForm from '../components/apertura/AperturaForm'
import CierreForm from '../components/cierre/CierreForm'

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

function labelTurno(turno) {
  return turno === 'manana' ? 'Mañana' : 'Tarde'
}

export default function Turno() {
  const perfil = useAuthStore((s) => s.perfil)
  const { registro, loading, error, refetch } = useTurno()

  const fechaFormateada = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })

  // El turno activo ES el último registro si está en marcha.
  // Si está cerrado (o no hay ninguno), hay que calcular el siguiente.
  const canApertura = !registro || registro.estado === 'cerrado'
  const canCierre = !!registro && ['apertura_ok', 'reabierto'].includes(registro.estado)

  // Calcular el turno/fecha del NUEVO turno a crear cuando canApertura=true
  let nuevoTurno = 'manana'
  let nuevaFecha = format(new Date(), 'yyyy-MM-dd')

  if (registro?.estado === 'cerrado') {
    if (registro.turno === 'manana') {
      nuevoTurno = 'tarde'
      nuevaFecha = registro.fecha
    } else {
      nuevoTurno = 'manana'
      nuevaFecha = format(addDays(parseISO(registro.fecha), 1), 'yyyy-MM-dd')
    }
  }

  // Para mostrar el turno activo en el header
  const turnoMostrado = canCierre ? registro.turno : nuevoTurno

  const [vistaActiva, setVistaActiva] = useState(null)

  // Inicializar y actualizar vistaActiva cuando cambia el estado del registro
  useEffect(() => {
    if (!loading) {
      if (canCierre) setVistaActiva('cierre')
      else if (canApertura) setVistaActiva('apertura')
    }
  }, [registro?.estado, loading])

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
          Turno {labelTurno(turnoMostrado)} — {fechaFormateada}
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

        {/* Formulario activo */}
        {vistaActiva === 'apertura' && canApertura && (
          <AperturaForm
            registro={registro}
            loading={loading}
            error={error}
            refetch={refetch}
            turnoActual={nuevoTurno}
            fechaHoy={nuevaFecha}
          />
        )}
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
