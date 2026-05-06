import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

// Determina el turno actual según la hora del día
function getTurnoActual() {
  const hora = new Date().getHours()
  return hora < 16 ? 'manana' : 'tarde'
}

// Obtiene la fecha de hoy en formato 'YYYY-MM-DD'
function getFechaHoy() {
  return format(new Date(), 'yyyy-MM-dd')
}

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

// Busca el fondo del turno anterior para heredarlo
// Si turno actual es 'manana' → busca 'tarde' del día anterior
// Si turno actual es 'tarde'  → busca 'manana' del mismo día
export async function obtenerFondoAnterior(turnoActual, fechaHoy) {
  let turnoAnterior
  let fechaBusqueda

  if (turnoActual === 'manana') {
    turnoAnterior = 'tarde'
    // Día anterior
    const ayer = new Date(fechaHoy)
    ayer.setDate(ayer.getDate() - 1)
    fechaBusqueda = format(ayer, 'yyyy-MM-dd')
  } else {
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

// Hook principal: gestiona el registro del turno actual
export function useTurno() {
  const [registro, setRegistro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const turnoActual = getTurnoActual()
  const fechaHoy = getFechaHoy()

  const fetchRegistro = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: supabaseError } = await supabase
        .from('turnos_registros')
        .select('*')
        .eq('turno', turnoActual)
        .eq('fecha', fechaHoy)
        .maybeSingle()

      if (supabaseError) throw supabaseError
      setRegistro(data ?? null)
    } catch (err) {
      console.error('useTurno: error al cargar registro', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [turnoActual, fechaHoy])

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
