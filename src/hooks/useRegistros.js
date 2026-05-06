import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRegistros(filtros = {}) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('turnos_registros')
        .select('*')
        .order('fecha', { ascending: false })
        .order('turno', { ascending: true })

      if (filtros.fechaDesde) {
        query = query.gte('fecha', filtros.fechaDesde)
      }
      if (filtros.fechaHasta) {
        query = query.lte('fecha', filtros.fechaHasta)
      }
      if (filtros.turno) {
        query = query.eq('turno', filtros.turno)
      }
      if (filtros.semaforo) {
        query = query.eq('cierre_semaforo', filtros.semaforo)
      }
      if (filtros.empleadoNombre) {
        query = query.ilike('empleado_nombre', `%${filtros.empleadoNombre}%`)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setRegistros(data ?? [])
    } catch (err) {
      console.error('Error cargando registros:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [
    filtros.fechaDesde,
    filtros.fechaHasta,
    filtros.turno,
    filtros.semaforo,
    filtros.empleadoNombre,
  ])

  useEffect(() => {
    fetchRegistros()
  }, [fetchRegistros])

  return { registros, loading, error, refetch: fetchRegistros }
}

export async function reabrirRegistro({ registroId, ownerId, motivo }) {
  const { error: insertError } = await supabase
    .from('reaperturas_log')
    .insert({ registro_id: registroId, owner_id: ownerId, motivo })

  if (insertError) return { error: insertError }

  const { data, error: updateError } = await supabase
    .from('turnos_registros')
    .update({ estado: 'reabierto', cierre_confirmado_at: null })
    .eq('id', registroId)
    .select()
    .single()

  if (updateError) return { error: updateError }

  return { data }
}

export async function obtenerReoperturas(registroId) {
  const { data: reaperturas, error } = await supabase
    .from('reaperturas_log')
    .select('*')
    .eq('registro_id', registroId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error cargando reaperturas:', error)
    return []
  }

  if (!reaperturas || reaperturas.length === 0) return []

  const ownerIds = [...new Set(reaperturas.map((r) => r.owner_id))]
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .in('id', ownerIds)

  const perfilesMap = Object.fromEntries((perfiles ?? []).map((p) => [p.id, p.nombre]))

  return reaperturas.map((r) => ({
    ...r,
    owner_nombre: perfilesMap[r.owner_id] ?? 'Desconocido',
  }))
}
