/**
 * Devuelve la etiqueta legible de un turno.
 * 'manana' → 'Turno 1', 'tarde' → 'Turno 2'
 */
export function labelTurno(turno) {
  return turno === 'manana' ? 'Turno 1' : turno === 'tarde' ? 'Turno 2' : '—'
}
