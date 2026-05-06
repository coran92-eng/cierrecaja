import { useEffect, useRef, useState } from 'react'

const inputClasses =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

const labelClasses = 'block text-xs font-medium text-gray-600 mb-1'

export default function FiltrosBar({ filtros = {}, onChange }) {
  const [empleadoInput, setEmpleadoInput] = useState(filtros.empleadoNombre ?? '')
  const debounceRef = useRef(null)

  // Sync empleado input when filtros reset from outside
  useEffect(() => {
    if (!filtros.empleadoNombre) {
      setEmpleadoInput('')
    }
  }, [filtros.empleadoNombre])

  function handleField(field, value) {
    onChange({ ...filtros, [field]: value })
  }

  function handleEmpleadoChange(value) {
    setEmpleadoInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filtros, empleadoNombre: value })
    }, 300)
  }

  function handleLimpiar() {
    setEmpleadoInput('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onChange({})
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="min-w-[140px]">
          <label className={labelClasses}>Desde</label>
          <input
            type="date"
            className={inputClasses}
            value={filtros.fechaDesde ?? ''}
            onChange={(e) => handleField('fechaDesde', e.target.value || undefined)}
          />
        </div>

        <div className="min-w-[140px]">
          <label className={labelClasses}>Hasta</label>
          <input
            type="date"
            className={inputClasses}
            value={filtros.fechaHasta ?? ''}
            onChange={(e) => handleField('fechaHasta', e.target.value || undefined)}
          />
        </div>

        <div className="min-w-[130px]">
          <label className={labelClasses}>Turno</label>
          <select
            className={inputClasses}
            value={filtros.turno ?? ''}
            onChange={(e) => handleField('turno', e.target.value || undefined)}
          >
            <option value="">Todos</option>
            <option value="manana">Mañana</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>

        <div className="min-w-[140px]">
          <label className={labelClasses}>Semáforo</label>
          <select
            className={inputClasses}
            value={filtros.semaforo ?? ''}
            onChange={(e) => handleField('semaforo', e.target.value || undefined)}
          >
            <option value="">Todos</option>
            <option value="verde">Verde</option>
            <option value="naranja">Naranja</option>
            <option value="rojo">Rojo</option>
          </select>
        </div>

        <div className="min-w-[180px] flex-1">
          <label className={labelClasses}>Empleado</label>
          <input
            type="text"
            className={inputClasses}
            placeholder="Buscar empleado..."
            value={empleadoInput}
            onChange={(e) => handleEmpleadoChange(e.target.value)}
          />
        </div>

        <div className="pb-0.5">
          <button
            onClick={handleLimpiar}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  )
}
