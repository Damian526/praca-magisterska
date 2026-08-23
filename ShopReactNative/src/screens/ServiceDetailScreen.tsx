import React, { useEffect, useState } from 'react'
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { apiService } from '../core/api'
import { API_URL } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { useCart } from '../core/cart'
import { COLORS, FONT, SPACING, RADIUS } from '../core/theme'
import type { Service } from '../core/types'

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceDetail'>

export default function ServiceDetailScreen({ route, navigation }: Props) {
  const { serviceId, measureStart } = route.params
  const { add } = useCart()
  const [service, setService] = useState<Service | null>(null)

  useEffect(() => {
    (async () => {
      const { data, serverMs } = await apiService(serviceId)
      setService(data)

      // ⭐ WSKAŹNIK 2 — od dotknięcia elementu listy
      //    do narysowania gotowego ekranu szczegółów.
      if (measureStart !== undefined) {
        afterPaint(() => {
          record('S2', 'ui_response_ms', now() - measureStart, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: { serviceId }
          })
        })
      }
    })()
  }, [serviceId, measureStart])

  if (!service) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: SPACING.xl }}>
      <Image source={{ uri: `${API_URL}${service.imageUrl}` }} style={s.hero} resizeMode="cover" />
      <View style={s.body}>
        <Text style={s.title}>{service.name}</Text>
        <Text style={s.meta}>{service.categoryName} · realizacja {service.deliveryTime} · ocena {service.rating}</Text>
        <Text style={s.price}>{formatPrice(service.price)}</Text>
        <Text style={s.desc}>{service.description}</Text>

        <Pressable style={s.btn} onPress={() => { add(service); navigation.navigate('Cart') }}>
          <Text style={s.btnTxt}>Dodaj do koszyka</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  hero:   { width: '100%', height: 220, backgroundColor: COLORS.border },
  body:   { padding: SPACING.lg },
  title:  { fontSize: FONT.xl, fontWeight: '700', color: COLORS.text },
  meta:   { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  price:  { fontSize: FONT.xl, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.md },
  desc:   { fontSize: FONT.base, color: COLORS.text, lineHeight: 22, marginTop: SPACING.md },
  btn:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, height: 50,
            alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl },
  btnTxt: { color: '#fff', fontSize: FONT.lg, fontWeight: '600' }
})