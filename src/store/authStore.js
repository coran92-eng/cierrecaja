import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const TIMEOUT_MS = 10000

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

async function loadPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error cargando perfil:', error)
    return null
  }

  return data
}

export const useAuthStore = create((set, get) => ({
  user: null,
  perfil: null,
  loading: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    const perfil = await loadPerfil(data.user.id)
    set({ user: data.user, perfil })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, perfil: null })
  },

  loadPerfil: async (userId) => {
    try {
      console.log('[loadPerfil] querying for userId:', userId)
      const { data, error, status, statusText } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()   // maybeSingle no lanza error si no hay filas

      console.log('[loadPerfil] result:', { data, error, status, statusText })

      if (error) {
        console.error('[loadPerfil] error:', error.message, error.code, error.details)
        return
      }
      if (!data) {
        console.warn('[loadPerfil] no perfil found for userId:', userId)
        return
      }
      set({ perfil: data })
      console.log('[loadPerfil] perfil set:', data)
    } catch (err) {
      console.error('[loadPerfil] catch:', err)
    }
  },

  init: async () => {
    try {
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        TIMEOUT_MS
      )
      if (error) throw error
      console.log('[init] session:', session ? `user: ${session.user.id}` : 'null')
      if (session?.user) {
        set({ user: session.user })
        await get().loadPerfil(session.user.id)
      }
    } catch (err) {
      console.error('[authStore] init error:', err)
    } finally {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          set({ user: session.user })
          await get().loadPerfil(session.user.id)
        } else {
          set({ user: null, perfil: null })
        }
      } catch (err) {
        console.error('[authStore] onAuthStateChange error:', err)
      }
    })
  },
}))
