import { useState, useEffect } from 'react'
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

// Hook principal: devuelve el último registro y los registros del día de hoy.
export function useTurno() {
  const [registro, setRegistro] = useState(null)
  const [registrosHoy, setRegistrosHoy] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTurno = async () => {
    setLoading(true)
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd')
      const [{ data: ultimo, error: e1 }, { data: hoyData, error: e2 }] = await Promise.all([
        supabase
          .from('turnos_registros')
          .select('*')
          .order('fecha', { ascending: false })
          .order('turno', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('turnos_registros')
          .select('turno, estado')
          .eq('fecha', hoy),
      ])
      if (e1) throw e1
      setRegistro(ultimo)
      setRegistrosHoy(hoyData ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTurno() }, [])

  return { registro, registrosHoy, loading, error, refetch: fetchTurno }
}

export default useTurno
