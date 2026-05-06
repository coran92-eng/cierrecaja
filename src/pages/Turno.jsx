import { format } from 'date-fns'
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
  const { turnoActual } = useTurno()

  const fechaFormateada = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })

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
          Turno {labelTurno(turnoActual)} — {fechaFormateada}
        </p>
      </div>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <AperturaForm />
        <CierreForm />
      </main>
    </div>
  )
}
