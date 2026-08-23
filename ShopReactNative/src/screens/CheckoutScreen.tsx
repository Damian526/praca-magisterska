import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useCart } from '../core/cart'
import { useAuth } from '../core/auth'
import { apiCreateOrder } from '../core/api'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { COLORS, FONT, SPACING, RADIUS } from '../core/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>

export default function CheckoutScreen({ navigation }: Props) {
  const { lines, total, clear } = useCart()
  const { user } = useAuth()
  const [name, setName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)

    // ── t0: dotknięcie przycisku ──
    const t0 = now()
    const body = {
      items: lines.map(l => ({ serviceId: l.service.id, quantity: l.quantity })),
      customerName: name,
      customerEmail: email
    }
    // ── t1: żądanie gotowe do wysłania (koszt walidacji + serializacji) ──
    const t1 = now()

    try {
      const { serverMs, totalMs } = await apiCreateOrder(body)
      // ── t2: odpowiedź odebrana ──
      const t2 = now()

      record('S3', 'ui_response_ms', t1 - t0, 'ms', { extra: { faza: 'przygotowanie' } })
      record('S3', 'api_request_ms', t2 - t1, 'ms', {
        serverMs: serverMs ?? undefined,
        extra: { faza: 'siec_plus_serwer', totalMs }
      })

      clear()
      afterPaint(() => {
        // ── t3: ekran historii narysowany ──
        record('S3', 'render_ms', now() - t2, 'ms', { extra: { faza: 'render_po_odpowiedzi' } })
      })
      navigation.replace('Orders')
    } catch (e: any) {
      setError(e.message ?? 'Nie udało się złożyć zamówienia')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Imię i nazwisko</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} />

      <Text style={s.label}>Adres e-mail</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail}
                 autoCapitalize="none" keyboardType="email-address" />

      <Text style={s.total}>Do zapłaty: {formatPrice(total)}</Text>
      {error && <Text style={s.error}>{error}</Text>}

      <Pressable style={s.btn} onPress={submit} disabled={busy || lines.length === 0}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Złóż zamówienie</Text>}
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  wrap:  { flex: 1, padding: SPACING.lg, backgroundColor: COLORS.bg },
  label: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
           borderRadius: RADIUS.sm, height: 46, paddingHorizontal: SPACING.md,
           fontSize: FONT.base, color: COLORS.text },
  total: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xl },
  btn:   { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, height: 50,
           alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  btnTxt: { color: '#fff', fontSize: FONT.lg, fontWeight: '600' },
  error: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.md }
})