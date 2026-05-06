import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'

export default function Dashboard() {
  const { user, perfil, loading } = useAuthStore()
  const [timeout, setTimeoutReached] = useState(false)

  useEffect(() => {
    if (user && !perfil) {
      const t = setTimeout(() => setTimeoutReached(true), 5000)
      return () => clearTimeout(t)
    }
  }, [user, perfil])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (perfil?.rol === 'owner') return <Navigate to="/owner" replace />
  if (perfil?.rol === 'empleado') return <Navigate to="/turno" replace />

  if (timeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-6 bg-white rounded-xl shadow">
          <p className="text-red-600 font-medium">No se pudo cargar el perfil</p>
          <p className="text-sm text-gray-500 mt-2">{user.email}</p>
          <p className="text-xs text-gray-400 mt-1">Revisa la consola del navegador para mas detalles</p>
          <button
            onClick={() => useAuthStore.getState().signOut()}
            className="mt-4 text-sm text-blue-600 underline"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-gray-600 mt-3">Cargando perfil...</p>
        <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
      </div>
    </div>
  )
}
