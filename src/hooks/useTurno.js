import { useState, useEffect, useCallback } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'

// Crea un nuevo registro de apertura con estado 'pendiente'
export async function crearApertura({
  turnoNombre,
  fecha,
  empleadoId,
  empleadoNombre,
  fondoHeredado,
  fondoEditable,
}) {
  const { data, error } = await supabase
    .from('turnos_registros')
    .insert({
      turno: turnoNombre,
      fecha,
      empleado_id: empleadoId,
      empleado_nombre: empleadoNombre,
      apertura_fondo_heredado: fondoHeredado ?? null,
      apertura_fondo_editable: fondoEditable ?? false,
      estado: 'pendiente',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Confirma la apertura: guarda desglose, total contado y diferencia
export async function confirmarApertura({ id, desglose, totalContado, diferencia }) {
  const { data, error } = await supabase
    .from('turnos_registros')
    .update({
      apertura_desglose: desglose,
      apertura_total_contado: Math.round(totalContado * 100) / 100,
      apertura_diferencia: Math.round(diferencia * 100) / 100,
      apertura_confirmada_at: new Date().toISOString(),
      estado: 'apertura_ok',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Busca el fondo del turno anterior para heredarlo.
// Usa la misma lógica que useTurno: el turno anterior es el que precedió
// al turno activo (turnoActual/fechaHoy) según la secuencia manana→tarde→manana(+1día).
export async function obtenerFondoAnterior(turnoActual, fechaHoy) {
  let turnoAnterior
  let fechaBusqueda

  if (turnoActual === 'manana') {
    // El turno que cierra antes de una mañana es la tarde del día anterior
    turnoAnterior = 'tarde'
    fechaBusqueda = format(addDays(parseISO(fechaHoy), -1), 'yyyy-MM-dd')
  } else {
    // El turno que cierra antes de una tarde es la mañana del mismo día
    turnoAnterior = 'manana'
    fechaBusqueda = fechaHoy
  }

  const { data, error } = await supabase
    .from('turnos_registros')
    .select('estado, cierre_fondo_definido')
    .eq('turno', turnoAnterior)
    .eq('fecha', fechaBusqueda)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    // No hay registro previo: es el primer registro histórico
    return { fondo: null, encontrado: false, turnoAnteriorCerrado: true }
  }

  const turnoAnteriorCerrado = data.estado === 'cerrado'

  return {
    fondo: data.cierre_fondo_definido ?? null,
    encontrado: true,
    turnoAnteriorCerrado,
  }
}

// Hook principal: gestiona el registro del turno activo.
// El turno activo se determina a partir del último registro en la BD:
//   - Sin registros → primer turno: manana, fecha hoy
//   - Último cerrado + turno manana → siguiente: tarde, misma fecha
//   - Último cerrado + turno tarde  → siguiente: manana, día siguiente
//   - Último en otro estado (apertura_ok, pendiente, reabierto) → ese mismo registro es el activo
export function useTurno() {
  const [registro, setRegistro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [turnoActual, setTurnoActual] = useState(null)
  const [fechaHoy, setFechaHoy] = useState(null)

  const fetchRegistro = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Buscar el último registro (cualquier turno, cualquier fecha)
      const { data: ultimoRegistro, error: errorUltimo } = await supabase
        .from('turnos_registros')
        .select('*')
        .order('fecha', { ascending: false })
        .order('turno', { ascending: false }) // 'tarde' > 'manana' alfabéticamente
        .limit(1)
        .maybeSingle()

      if (errorUltimo) throw errorUltimo

      // 2. Determinar el turno/fecha activo basado en el último registro
      let turno, fecha

      if (!ultimoRegistro) {
        // Sin historial → primer turno
        turno = 'manana'
        fecha = format(new Date(), 'yyyy-MM-dd')
      } else if (ultimoRegistro.estado === 'cerrado') {
        // Último cerrado → calcular el siguiente turno
        if (ultimoRegistro.turno === 'manana') {
          turno = 'tarde'
          fecha = ultimoRegistro.fecha // mismo día
        } else {
          // turno === 'tarde' → siguiente es manana del día siguiente
          turno = 'manana'
          fecha = format(addDays(parseISO(ultimoRegistro.fecha), 1), 'yyyy-MM-dd')
        }
      } else {
        // apertura_ok, pendiente, reabierto → el turno activo ES ese registro
        turno = ultimoRegistro.turno
        fecha = ultimoRegistro.fecha
      }

      setTurnoActual(turno)
      setFechaHoy(fecha)

      // 3. Buscar el registro para ese turno/fecha activo
      const { data, error: supabaseError } = await supabase
        .from('turnos_registros')
        .select('*')
        .eq('turno', turno)
        .eq('fecha', fecha)
        .maybeSingle()

      if (supabaseError) throw supabaseError
      setRegistro(data ?? null)
    } catch (err) {
      console.error('useTurno: error al cargar registro', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRegistro()
  }, [fetchRegistro])

  return {
    registro,
    loading,
    error,
    refetch: fetchRegistro,
    turnoActual,
    fechaHoy,
  }
}

export default useTurno
