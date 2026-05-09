// Supabase Edge Function — send-notifications
// Roda diariamente via cron e envia push notifications de vencimentos

import { createClient } from "jsr:@supabase/supabase-js@2"
// @ts-ignore — npm specifier disponível no Deno 1.28+
import webpush from "npm:web-push@3"

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:contato@guigabifiancas.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const today    = new Date()
    const todayISO = today.toISOString().split('T')[0] // YYYY-MM-DD
    const todayDay = today.getDate() // 1-31

    // ── 1. Lançamentos com aviso de vencimento ───────────────────────────────
    const { data: lancamentos } = await supabase
      .from('lancamentos')
      .select('user_id, descricao, valor, data_vencimento, dias_aviso')
      .eq('notificar', true)
      .gte('data_vencimento', todayISO) // não avisar sobre passados

    const lancamentosParaNotificar: { user_id: string; descricao: string; valor: number; data_vencimento: string }[] = []

    for (const l of lancamentos ?? []) {
      const venc     = new Date(l.data_vencimento + 'T12:00:00')
      const diffDias = Math.round((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDias === l.dias_aviso) {
        lancamentosParaNotificar.push(l)
      }
    }

    // ── 2. Cartões com fatura próxima do vencimento ──────────────────────────
    const { data: cartoes } = await supabase
      .from('cartoes')
      .select('user_id, nome, icone, dia_vencimento, dias_aviso_fatura')
      .not('dia_vencimento', 'is', null)

    const cartoesParaNotificar: { user_id: string; nome: string; icone: string; dia_vencimento: number }[] = []

    for (const c of cartoes ?? []) {
      const diasParaVencer = c.dia_vencimento - todayDay
      if (diasParaVencer === c.dias_aviso_fatura) {
        cartoesParaNotificar.push(c)
      }
    }

    // ── 3. Agrupa notificações por usuário ───────────────────────────────────
    const notifsByUser: Record<string, { title: string; body: string }[]> = {}

    for (const l of lancamentosParaNotificar) {
      const msg = {
        title: '💰 Vencimento próximo',
        body:  `${l.descricao} vence em ${l.dias_aviso === 1 ? '1 dia' : `${l.dias_aviso} dias`}`,
      }
      notifsByUser[l.user_id] ??= []
      notifsByUser[l.user_id].push(msg)
    }

    for (const c of cartoesParaNotificar) {
      const msg = {
        title: '💳 Fatura chegando',
        body:  `Fatura ${c.icone} ${c.nome} vence dia ${c.dia_vencimento}`,
      }
      notifsByUser[c.user_id] ??= []
      notifsByUser[c.user_id].push(msg)
    }

    if (Object.keys(notifsByUser).length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // ── 4. Busca subscriptions e envia ──────────────────────────────────────
    const userIds = Object.keys(notifsByUser)
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', userIds)

    let sent = 0
    const toDelete: string[] = []

    for (const sub of subs ?? []) {
      const notifs = notifsByUser[sub.user_id]
      if (!notifs?.length) continue

      // Se há múltiplos avisos, agrupa em uma notificação
      const payload = notifs.length === 1
        ? notifs[0]
        : { title: `📅 ${notifs.length} avisos financeiros`, body: notifs.map(n => n.body).join(' · ') }

      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
        sent++
      } catch (err: unknown) {
        // Subscription expirada/inválida — remove do banco
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          toDelete.push(sub.subscription.endpoint)
        }
      }
    }

    // Remove subscriptions inválidas
    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toDelete)
    }

    return new Response(JSON.stringify({ sent, toDelete: toDelete.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
