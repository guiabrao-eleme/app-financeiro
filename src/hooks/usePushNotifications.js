import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// Converte a chave VAPID base64url para Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuth()

  const [supported, setSupported]   = useState(false)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)

  // Detecta suporte ao carregar
  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(ok)
    if (ok) setPermission(Notification.permission)
  }, [])

  // Verifica se já está inscrito
  useEffect(() => {
    if (!supported || !user) return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported, user])

  // Inscreve neste dispositivo e salva no Supabase
  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_PUBLIC_KEY) return { error: 'Não suportado' }
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return { error: 'Permissão negada' }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id:     user.id,
          endpoint:    subJson.endpoint,
          subscription: subJson,
          device_info: navigator.userAgent,
        },
        { onConflict: 'endpoint' }
      )

      if (error) throw error
      setSubscribed(true)
      return { error: null }
    } catch (err) {
      console.error('Push subscribe error:', err)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [supported, user])

  // Cancela inscrição deste dispositivo
  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
      return { error: null }
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
