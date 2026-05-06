const UMBRAL_EFECTIVO = 10
const UMBRAL_TARJETA = 5

function calcularEstado(difEfectivo, difTarjeta) {
  const absEf = Math.abs(difEfectivo)
  const absTa = Math.abs(difTarjeta)

  if (absEf === 0 && absTa === 0) return 'verde'
  if (absEf <= UMBRAL_EFECTIVO && absTa <= UMBRAL_TARJETA) return 'naranja'
  return 'rojo'
}

function colorIndividual(diferencia, umbral) {
  return Math.abs(diferencia) <= umbral ? 'text-amber-600' : 'text-red-600'
}

function formatDif(dif) {
  const abs = Math.abs(dif).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return dif >= 0 ? `+${abs} €` : `-${abs} €`
}

const CONFIG_ESTADO = {
  verde: {
    circulo: 'bg-green-500',
    etiqueta: 'Cuadrado',
    texto: 'text-green-700',
  },
  naranja: {
    circulo: 'bg-amber-400',
    etiqueta: 'Diferencia leve',
    texto: 'text-amber-700',
  },
  rojo: {
    circulo: 'bg-red-500',
    etiqueta: 'Descuadre',
    texto: 'text-red-700',
  },
}

export default function Semaforo({
  difEfectivo = 0,
  difTarjeta = 0,
  mostrarDetalle = true,
}) {
  const estado = calcularEstado(difEfectivo, difTarjeta)
  const { circulo, etiqueta, texto } = CONFIG_ESTADO[estado]

  const colorEf = Math.abs(difEfectivo) === 0 ? 'text-green-600' : colorIndividual(difEfectivo, UMBRAL_EFECTIVO)
  const colorTa = Math.abs(difTarjeta) === 0 ? 'text-green-600' : colorIndividual(difTarjeta, UMBRAL_TARJETA)

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-4 h-4 rounded-full shrink-0 ${circulo}`} />
        <span className={`text-sm font-semibold ${texto}`}>{etiqueta}</span>
      </div>
      {mostrarDetalle && (
        <div className="ml-6 flex flex-col gap-0.5">
          <span className={`text-xs font-medium ${colorEf}`}>
            Efectivo: {formatDif(difEfectivo)}
          </span>
          <span className={`text-xs font-medium ${colorTa}`}>
            Tarjeta: {formatDif(difTarjeta)}
          </span>
        </div>
      )}
    </div>
  )
}
