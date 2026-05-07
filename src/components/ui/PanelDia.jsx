const PASOS = [
  { label: 'Apertura', sub: 'Turno 1', turno: 'manana', tipo: 'apertura' },
  { label: 'Cierre',   sub: 'Turno 1', turno: 'manana', tipo: 'cierre'   },
  { label: 'Apertura', sub: 'Turno 2', turno: 'tarde',  tipo: 'apertura' },
  { label: 'Cierre',   sub: 'Turno 2', turno: 'tarde',  tipo: 'cierre'   },
]

function getEstado(registrosHoy, turno, tipo) {
  const reg = registrosHoy.find((r) => r.turno === turno)
  if (!reg) return 'pendiente'
  if (tipo === 'apertura') {
    return ['apertura_ok', 'cerrado', 'reabierto'].includes(reg.estado) ? 'hecho'
      : reg.estado === 'pendiente' ? 'en_curso'
      : 'pendiente'
  }
  return reg.estado === 'cerrado' ? 'hecho'
    : ['apertura_ok', 'reabierto'].includes(reg.estado) ? 'en_curso'
    : 'pendiente'
}

export default function PanelDia({ registrosHoy }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Estado del día</p>
      <div className="grid grid-cols-4 gap-2">
        {PASOS.map(({ label, sub, turno, tipo }) => {
          const estado = getEstado(registrosHoy, turno, tipo)
          const hecho = estado === 'hecho'
          const enCurso = estado === 'en_curso'
          return (
            <div
              key={`${turno}-${tipo}`}
              className={`rounded-lg p-3 flex flex-col items-center gap-1 text-center border ${
                hecho   ? 'bg-green-50 border-green-200' :
                enCurso ? 'bg-blue-50 border-blue-200'  :
                          'bg-gray-50 border-gray-200'
              }`}
            >
              <span className={`text-xl font-bold leading-none ${
                hecho   ? 'text-green-500' :
                enCurso ? 'text-blue-500'  :
                          'text-gray-300'
              }`}>
                {hecho ? '✓' : enCurso ? '→' : '·'}
              </span>
              <span className={`text-xs font-semibold ${
                hecho   ? 'text-green-700' :
                enCurso ? 'text-blue-700'  :
                          'text-gray-400'
              }`}>
                {label}
              </span>
              <span className={`text-xs ${
                hecho   ? 'text-green-500' :
                enCurso ? 'text-blue-500'  :
                          'text-gray-300'
              }`}>
                {sub}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
