import { supabase } from '../lib/supabase'

function calcularSemaforo(difEfectivo, difTarjeta) {
  const absEf = Math.abs(difEfectivo)
  const absTa = Math.abs(difTarjeta)
  if (absEf === 0 && absTa === 0) return 'verde'
  if (absEf <= 10 && absTa <= 5) return 'naranja'
  return 'rojo'
}

export async function guardarCierre({
  registroId,
  desglose,
  totalCaja,
  fondoDefinido,
  tpvEfectivo,
  tpvTarjeta,
  tpvVoids,
  numTickets,
  datafonos,
}) {
  const efectivoNeto = Math.round((totalCaja - fondoDefinido) * 100) / 100
  const totalDatafonos = Math.round(
    datafonos.reduce((acc, d) => acc + (parseFloat(d.importe) || 0), 0) * 100
  ) / 100
  const difEfectivo = Math.round((efectivoNeto - tpvEfectivo) * 100) / 100
  const difTarjeta = Math.round((totalDatafonos - tpvTarjeta) * 100) / 100
  const semaforo = calcularSemaforo(difEfectivo, difTarjeta)

  const { data, error } = await supabase
    .from('turnos_registros')
    .update({
      cierre_desglose: desglose,
      cierre_total_caja: totalCaja,
      cierre_fondo_definido: fondoDefinido,
      cierre_efectivo_neto: efectivoNeto,
      cierre_tpv_efectivo: tpvEfectivo,
      cierre_tpv_tarjeta: tpvTarjeta,
      cierre_tpv_voids: tpvVoids,
      cierre_num_tickets: numTickets ?? null,
      cierre_dif_efectivo: difEfectivo,
      cierre_dif_tarjeta: difTarjeta,
      cierre_semaforo: semaforo,
      cierre_confirmado_at: new Date().toISOString(),
      estado: 'cerrado',
    })
    .eq('id', registroId)
    .select()
    .single()

  if (error) return { error }

  // Borrar datáfonos previos e insertar los nuevos
  const { error: deleteError } = await supabase
    .from('datafonos_cierre')
    .delete()
    .eq('registro_id', registroId)

  if (deleteError) return { error: deleteError }

  const filas = datafonos.map((d, i) => ({
    registro_id: registroId,
    nombre: d.nombre,
    importe: Math.round((parseFloat(d.importe) || 0) * 100) / 100,
    orden: i + 1,
  }))

  const { error: insertError } = await supabase
    .from('datafonos_cierre')
    .insert(filas)

  if (insertError) return { error: insertError }

  return { data }
}

export async function obtenerDatafonos(registroId) {
  const { data, error } = await supabase
    .from('datafonos_cierre')
    .select('*')
    .eq('registro_id', registroId)
    .order('orden')

  if (error) throw error
  return data ?? []
}
