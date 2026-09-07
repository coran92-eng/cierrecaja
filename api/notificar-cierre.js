/**
 * Aviso por Telegram al confirmar un cierre de turno.
 *
 * Vercel Serverless Function (no Vite): el token del bot vive solo aquí, en
 * variables de entorno de servidor (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID),
 * nunca en el bundle del cliente. Mismo criterio que en la app de fichajes:
 * sin configurar, no se manda nada (no es un requisito para que la app
 * funcione) y un fallo aquí nunca debe reventar de cara al usuario — por
 * eso siempre se responde 200 salvo que la petición no esté autenticada o
 * el body venga incompleto.
 *
 * Protegido con el JWT de sesión de Supabase (el mismo que ya usa el
 * cliente): sin esto, cualquiera que encontrara la URL en el bundle podría
 * hacer POST directo y spamear el chat de Telegram con cierres falsos.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!token) {
    return res.status(401).json({ error: 'No autorizado', motivo: 'sin_token' })
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('notificar-cierre: faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno de Vercel')
    return res.status(500).json({ error: 'Configuración del servidor incompleta', motivo: 'sin_supabase_env' })
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
    })
    if (!authRes.ok) {
      const detalle = await authRes.text().catch(() => '')
      console.error('notificar-cierre: token de sesión rechazado por Supabase', authRes.status, detalle)
      return res.status(401).json({ error: 'No autorizado', motivo: 'token_rechazado' })
    }
  } catch (err) {
    console.error('notificar-cierre: fallo al verificar el token contra Supabase', err.message)
    return res.status(401).json({ error: 'No autorizado', motivo: 'fallo_verificacion' })
  }

  const {
    turno, fecha, empleado,
    efectivoNeto, tarjeta, total,
    difEfectivo, difTarjeta, semaforo,
    numTickets, voids,
  } = req.body ?? {}

  if (!turno || !fecha || typeof efectivoNeto !== 'number' || typeof tarjeta !== 'number') {
    console.error('notificar-cierre: datos de cierre incompletos', { turno, fecha, efectivoNeto, tarjeta })
    return res.status(400).json({ error: 'Datos de cierre incompletos' })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) {
    console.error('notificar-cierre: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en el entorno de Vercel')
    return res.status(200).json({ ok: true, enviado: false, motivo: 'telegram_no_configurado' })
  }

  const ETIQUETA_TURNO = { manana: 'Turno 1 (mañana)', tarde: 'Turno 2 (tarde)' }
  const EMOJI_SEMAFORO = { verde: '🟢', naranja: '🟠', rojo: '🔴' }

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const fmt = (n) => `${Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  const fmtDif = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${fmt(n)}`

  const cabecera = semaforo === 'rojo'
    ? '🔴 <b>Descuadre en el cierre de caja</b>'
    : `${EMOJI_SEMAFORO[semaforo] ?? '⚪'} Cierre de caja confirmado`

  const lineas = [
    cabecera,
    `${esc(ETIQUETA_TURNO[turno] ?? turno)} · ${esc(fecha)}${empleado ? ` · ${esc(empleado)}` : ''}`,
    '',
    `💶 Efectivo: <b>${fmt(efectivoNeto)}</b>`,
    `💳 Tarjeta: <b>${fmt(tarjeta)}</b>`,
    `🧾 Total: <b>${fmt(total)}</b>`,
    '',
    `Diferencia efectivo: ${fmtDif(difEfectivo)}`,
    `Diferencia tarjeta: ${fmtDif(difTarjeta)}`,
  ]
  if (numTickets != null) lineas.push(`Tickets: ${numTickets}`)
  if (voids != null && Number(voids) > 0) lineas.push(`Voids: ${voids}`)

  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lineas.join('\n'),
        parse_mode: 'HTML',
      }),
    })
    const json = await r.json()
    if (json && json.ok === false) {
      console.error('Telegram rechazó sendMessage:', json.description || json)
      return res.status(200).json({ ok: true, enviado: false })
    }
    return res.status(200).json({ ok: true, enviado: true })
  } catch (error) {
    console.error('Telegram no respondió:', error.message)
    return res.status(200).json({ ok: true, enviado: false })
  }
}
