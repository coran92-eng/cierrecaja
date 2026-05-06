import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useRegistros, reabrirRegistro } from '../hooks/useRegistros'
import FiltrosBar from '../components/owner/FiltrosBar'
import TablaRegistros from '../components/owner/TablaRegistros'
import ModalReapertura from '../components/owner/ModalReapertura'
import { useToast } from '../components/ui/Toast'

function formatEuro(valor) {
  if (valor === null || valor === undefined) return '—'
  const rounded = Math.round(valor * 100) / 100
  return `€${rounded.toFixed(2)}`
}

function StatCard({ label, value, colorClass = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
    </div>
  )
}

export default function OwnerPanel() {
  const { user, perfil, signOut } = useAuthStore()
  const { addToast } = useToast()
  const [filtros, setFiltros] = useState({})
  const [registroAReabrir, setRegistroAReabrir] = useState(null)
  const [errorReapertura, setErrorReapertura] = useState(null)

  const { registros, loading, error, refetch } = useRegistros(filtros)

  // Stats derivadas de los registros cargados
  const totalCierres = registros.filter((r) => r.estado === 'cerrado').length
  const cierresRojo = registros.filter((r) => r.cierre_semaforo === 'rojo').length
  const difTotalEfectivo = registros.reduce((acc, r) => {
    if (r.cierre_dif_efectivo !== null && r.cierre_dif_efectivo !== undefined) {
      return acc + Math.abs(Math.round(r.cierre_dif_efectivo * 100) / 100)
    }
    return acc
  }, 0)
  const difTotalTarjeta = registros.reduce((acc, r) => {
    if (r.cierre_dif_tarjeta !== null && r.cierre_dif_tarjeta !== undefined) {
      return acc + Math.abs(Math.round(r.cierre_dif_tarjeta * 100) / 100)
    }
    return acc
  }, 0)

  async function handleConfirmarReapertura(motivo) {
    setErrorReapertura(null)
    const { error: err } = await reabrirRegistro({
      registroId: registroAReabrir.id,
      ownerId: user.id,
      motivo,
    })
    if (err) {
      const msg = typeof err === 'string' ? err : 'Error al reabrir'
      setErrorReapertura('Error al reabrir el cierre. Inténtalo de nuevo.')
      addToast({ message: msg, type: 'error' })
      return
    }
    setRegistroAReabrir(null)
    refetch()
    addToast({ message: 'Registro reabierto', type: 'warning' })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Panel Owner</h1>
            {perfil?.nombre && (
              <p className="text-sm text-gray-500 mt-0.5">Bienvenido, {perfil.nombre}</p>
            )}
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filtros */}
        <FiltrosBar filtros={filtros} onChange={setFiltros} />

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total cierres" value={totalCierres} />
          <StatCard
            label="Cierres en rojo"
            value={cierresRojo}
            colorClass={cierresRojo > 0 ? 'text-red-600' : 'text-gray-900'}
          />
          <StatCard
            label="Dif. total efectivo"
            value={formatEuro(difTotalEfectivo)}
            colorClass={difTotalEfectivo > 0 ? 'text-amber-600' : 'text-gray-900'}
          />
          <StatCard
            label="Dif. total tarjeta"
            value={formatEuro(difTotalTarjeta)}
            colorClass={difTotalTarjeta > 0 ? 'text-amber-600' : 'text-gray-900'}
          />
        </div>

        {/* Error alerta de reapertura */}
        {errorReapertura && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{errorReapertura}</span>
            <button
              onClick={() => setErrorReapertura(null)}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Tabla de registros */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">Cargando registros...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            Error al cargar los registros. Por favor, recarga la página.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TablaRegistros
              registros={registros}
              onReabrir={(reg) => {
                setErrorReapertura(null)
                setRegistroAReabrir(reg)
              }}
            />
          </div>
        )}
      </main>

      {/* Modal reapertura */}
      <ModalReapertura
        registro={registroAReabrir}
        onClose={() => setRegistroAReabrir(null)}
        onConfirm={handleConfirmarReapertura}
      />
    </div>
  )
}
