import React from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useCart } from '../core/cart'
import { formatPrice } from '../core/format'
import { COLORS, FONT, SPACING, RADIUS } from '../core/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>

export default function CartScreen({ navigation }: Props) {
  const { lines, setQty, remove, total } = useCart()

  return (
    <View style={s.wrap}>
      <FlatList
        data={lines}
        keyExtractor={l => l.service.id}
        ListEmptyComponent={<Text style={s.empty}>Koszyk jest pusty</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.content}>
              <Text style={s.title} numberOfLines={1}>{item.service.name}</Text>
              <Text style={s.price}>{formatPrice(item.service.price)} × {item.quantity}</Text>
            </View>
            <Pressable style={s.qtyBtn} onPress={() => setQty(item.service.id, item.quantity - 1)}>
              <Text style={s.qtyTxt}>−</Text>
            </Pressable>
            <Text style={s.qty}>{item.quantity}</Text>
            <Pressable style={s.qtyBtn} onPress={() => setQty(item.service.id, item.quantity + 1)}>
              <Text style={s.qtyTxt}>+</Text>
            </Pressable>
            <Pressable onPress={() => remove(item.service.id)}>
              <Text style={s.del}>Usuń</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={s.footer}>
        <Text style={s.total}>Razem: {formatPrice(total)}</Text>
        <Pressable
          style={[s.btn, lines.length === 0 && s.btnOff]}
          disabled={lines.length === 0}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={s.btnTxt}>Przejdź do zamówienia</Text>
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg,
         backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: FONT.base, fontWeight: '600', color: COLORS.text },
  price: { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg,
            alignItems: 'center', justifyContent: 'center' },
  qtyTxt: { fontSize: FONT.lg, color: COLORS.text },
  qty: { width: 32, textAlign: 'center', fontSize: FONT.base, color: COLORS.text },
  del: { color: COLORS.danger, fontSize: FONT.sm, marginLeft: SPACING.md },
  footer: { padding: SPACING.lg, backgroundColor: COLORS.surface,
            borderTopWidth: 1, borderTopColor: COLORS.border },
  total: { fontSize: FONT.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, height: 50,
         alignItems: 'center', justifyContent: 'center' },
  btnOff: { opacity: 0.4 },
  btnTxt: { color: '#fff', fontSize: FONT.lg, fontWeight: '600' },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl }
})