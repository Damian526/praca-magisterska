import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { apiOrders } from '../core/api'
import { formatPrice, formatDate } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { COLORS, FONT, SPACING } from '../core/theme'
import type { Order } from '../core/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>

export default function OrdersScreen(_: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const t0 = now()
      try {
        const { data, serverMs } = await apiOrders(1, 20)
        setOrders(data.data)
        afterPaint(() => {
          record('S3', 'render_ms', now() - t0, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: { ekran: 'historia', count: data.data.length }
          })
        })
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>

  return (
    <FlatList
      style={s.wrap}
      data={orders}
      keyExtractor={o => o.id}
      ListEmptyComponent={<Text style={s.empty}>Brak zamówień</Text>}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.date}>{formatDate(item.createdAt)}</Text>
          <Text style={s.status}>{item.status}</Text>
          {item.items.map(it => (
            <Text key={it.serviceId} style={s.line} numberOfLines={1}>
              {it.serviceName} × {it.quantity}
            </Text>
          ))}
          <Text style={s.total}>{formatPrice(item.total)}</Text>
        </View>
      )}
    />
  )
}

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, margin: SPACING.md, padding: SPACING.lg,
          borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  date:   { fontSize: FONT.sm, color: COLORS.textMuted },
  status: { fontSize: FONT.sm, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  line:   { fontSize: FONT.base, color: COLORS.text, marginTop: SPACING.xs },
  total:  { fontSize: FONT.lg, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.md },
  empty:  { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl }
})