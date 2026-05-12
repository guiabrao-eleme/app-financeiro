// Hook para integração com Google Calendar via OAuth 2.0 (token implícito / GIS)
// Não precisa de client_secret — apenas o client_id público é necessário no frontend.

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SCOPE        = 'https://www.googleapis.com/auth/calendar.events'
const EVENTS_URL   = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TOKEN_KEY    = 'gcal_access_token'
const EXPIRY_KEY   = 'gcal_token_expiry'

// ─── GIS loader singleton ────────────────────────────────────────────────────
let gisReady = false
let gisQueue = []

function loadGIS() {
  return new Promise((resolve) => {
    if (gisReady || window.google?.accounts?.oauth2) { gisReady = true; resolve(); return }
    gisQueue.push(resolve)
    if (document.querySelector('script[src*="gsi/client"]')) return // já está carregando
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => {
      gisReady = true
      gisQueue.forEach(fn => fn())
      gisQueue = []
    }
    document.head.appendChild(s)
  })
}

// ─── Token helpers ────────────────────────────────────────────────────────────
function readToken() {
  const t = localStorage.getItem(TOKEN_KEY)
  const e = localStorage.getItem(EXPIRY_KEY)
  if (!t || !e || Date.now() >= Number(e)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    return null
  }
  return t
}

function writeToken(accessToken, expiresIn) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + (Number(expiresIn) - 60) * 1000))
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
}

// ─── Evento GCal ──────────────────────────────────────────────────────────────
function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function buildEvent(l) {
  const emoji = l.tipo === 'Entrada' ? '💚' : '🔴'
  const brl   = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(l.valor ?? 0)
  let extra = ''
  if (l.tipo_repeticao === 'recorrente') extra = '\n🔄 Recorrente'
  if (l.tipo_repeticao === 'parcelado')  extra = `\n💳 Parcela ${l.parcela_atual}/${l.total_parcelas}`

  const event = {
    summary:     `${emoji} ${l.descricao}`,
    description: `${l.tipo} · ${l.categoria}\nValor: ${brl}${extra}`,
    start:       { date: l.data_vencimento },
    end:         { date: nextDay(l.data_vencimento) },
    colorId:     l.tipo === 'Entrada' ? '10' : '11', // sage=verde, tomato=vermelho
  }

  event.reminders = l.notificar && l.dias_aviso > 0
    ? { useDefault: false, overrides: [{ method: 'popup', minutes: l.dias_aviso * 24 * 60 }] }
    : { useDefault: false, overrides: [] }

  return event
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoogleCalendar() {
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [connected, setConnected] = useState(() => !!readToken())
  const [loading, setLoading]     = useState(false)

  // Valida token no mount
  useEffect(() => { setConnected(!!readToken()) }, [])

  /**
   * Obtém token válido do localStorage.
   * Se interactive=true e não houver token, abre o popup do Google.
   */
  const getToken = useCallback(async (interactive = false) => {
    const cached = readToken()
    if (cached) return cached
    if (!CLIENT_ID || !interactive) return null

    await loadGIS()
    return new Promise((resolve) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope:     SCOPE,
        prompt:    '',
        callback: (resp) => {
          if (resp.error || !resp.access_token) { resolve(null); return }
          writeToken(resp.access_token, resp.expires_in)
          setConnected(true)
          resolve(resp.access_token)
        },
        error_callback: () => resolve(null),
      })
      client.requestAccessToken()
    })
  }, [CLIENT_ID])

  /** Abre o popup de autorização do Google (deve ser chamado por gesto do usuário). */
  const connect = useCallback(async () => {
    if (!CLIENT_ID) return { error: 'Configure VITE_GOOGLE_CLIENT_ID no .env e no Vercel.' }
    setLoading(true)
    const token = await getToken(true)
    setLoading(false)
    if (!token) return { error: 'Autorização cancelada ou falhou. Tente novamente.' }
    return { error: null }
  }, [CLIENT_ID, getToken])

  /** Remove token e desconecta. */
  const disconnect = useCallback(() => {
    clearToken()
    setConnected(false)
  }, [])

  // ── Operações de calendário ─────────────────────────────────────────────────

  /** Cria eventos para uma lista de lançamentos. Salva google_event_id em cada um. */
  const createEvents = useCallback(async (lancamentos) => {
    const token = await getToken()
    if (!token) return

    for (const l of lancamentos) {
      try {
        const res = await fetch(EVENTS_URL, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify(buildEvent(l)),
        })
        if (res.ok) {
          const { id } = await res.json()
          // Salva o ID no Supabase para edições/deleções futuras
          await supabase.from('lancamentos').update({ google_event_id: id }).eq('id', l.id)
        }
      } catch { /* não bloqueia o app */ }
    }
  }, [getToken])

  /** Atualiza evento existente; cria se ainda não tiver google_event_id. */
  const updateEvent = useCallback(async (lancamento) => {
    if (!lancamento.google_event_id) { await createEvents([lancamento]); return }
    const token = await getToken()
    if (!token) return
    try {
      await fetch(`${EVENTS_URL}/${lancamento.google_event_id}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildEvent(lancamento)),
      })
    } catch { /* não bloqueia */ }
  }, [getToken, createEvents])

  /** Deleta evento pelo google_event_id (não precisa de prompt se token expirou). */
  const deleteEvent = useCallback(async (googleEventId) => {
    if (!googleEventId) return
    const token = readToken() // só deleta se token ainda válido, sem prompt
    if (!token) return
    try {
      await fetch(`${EVENTS_URL}/${googleEventId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* não bloqueia */ }
  }, [])

  return { connected, loading, connect, disconnect, createEvents, updateEvent, deleteEvent }
}
