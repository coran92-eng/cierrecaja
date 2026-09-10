import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Devuelve la etiqueta legible de un turno.
 * 'manana' → 'Turno 1', 'tarde' → 'Turno 2'
 */
export function labelTurno(turno) {
  return turno === 'manana' ? 'Turno 1' : turno === 'tarde' ? 'Turno 2' : '—'
}

/**
 * Formatea una fecha 'yyyy-MM-dd' como "viernes 29 de mayo de 2026",
 * interpretándola en horario local (no UTC) para evitar el típico
 * desfase de un día con new Date('yyyy-MM-dd').
 */
export function formatFechaLarga(fechaStr) {
  try {
    const [anio, mes, dia] = fechaStr.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    return format(fecha, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return fechaStr
  }
}
