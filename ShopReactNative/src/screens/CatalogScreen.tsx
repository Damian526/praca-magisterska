import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, Image, Pressable,
  ActivityIndicator, StyleSheet
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { apiServices } from '../core/api'
import { API_URL, PAGE_SIZE } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { useCart } from '../core/cart'
import { COLORS, FONT, SPACING, LIST_ITEM_HEIGHT, THUMB_SIZE } from '../core/theme'
import type { Service } from '../core/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Catalog'>

export default function CatalogScreen({ navigation }: Props) {
  const { count } = useCart()
  const [items, setItems] = useState<Service[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const startupRecorded = useRef(false)

  const load = useCallback(async (p: number) => {
    if (loading) return
    setLoading(true)
    try {
      const { data, serverMs } = await apiServices({ page: p, limit: PAGE_SIZE })
      setItems(prev => (p === 1 ? data.data : [...prev, ...data.data]))
      setTotalPages(data.meta.totalPages)
      setPage(p)

      // ⭐ WSKAŹNIK 1 — czas uruchomienia.
      // Mierzony tylko przy pierwszym załadowaniu, po narysowaniu klatki.
      if (p === 1 && !startupRecorded.current) {
        startupRecorded.current = true
        afterPaint(() => {
          const startupMs = now() - (globalThis as any).__APP_START__
          record('S1', 'startup_ms', startupMs, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: { listSize: PAGE_SIZE }
          })
        })
      }
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => { load(1) }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  /** ⭐ WSKAŹNIK 2 — czas reakcji UI.
   *  Znacznik z momentu dotknięcia przekazujemy do ekranu docelowego. */
  const openDetail = useCallback((serviceId: string) => {
    navigation.navigate('ServiceDetail', { serviceId, measureStart: now() })
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: Service }) => (
    <Pressable style={s.row} onPress={() => openDetail(item.id)}>
      <Image
        source={{ uri: `${API_URL}${item.imageUrl}` }}
        style={s.thumb}
        resizeMode="cover"
      />
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{item.categoryName} · {item.deliveryTime}</Text>
        <Text style={s.rowPrice}>{formatPrice(item.price)}</Text>
      </View>
    </Pressable>
  ), [openDetail])

  return (
    <View style={s.wrap}>
      <View style={s.bar}>
        <Pressable onPress={() => navigation.navigate('Search')}>
          <Text style={s.barLink}>Szukaj</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Orders')}>
          <Text style={s.barLink}>Historia</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Cart')}>
          <Text style={s.barLink}>Koszyk ({count})</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        // ⚠️ getItemLayout wymaga stałej wysokości wiersza — dlatego
        // LIST_ITEM_HEIGHT jest w theme.ts i identyczne w obu apkach.
        getItemLayout={(_, index) => ({
          length: LIST_ITEM_HEIGHT, offset: LIST_ITEM_HEIGHT * index, index
        })}
        onEndReachedThreshold={0.5}
        onEndReached={() => { if (page < totalPages && !loading) load(page + 1) }}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: SPACING.lg }} /> : undefined}
      />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  bar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: SPACING.md, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  barLink: { color: COLORS.primary, fontSize: FONT.base, fontWeight: '600' },
  row: {
    height: LIST_ITEM_HEIGHT, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, backgroundColor: COLORS.border },
  rowBody: { flex: 1, marginLeft: SPACING.md },
  rowTitle: { fontSize: FONT.base, fontWeight: '600', color: COLORS.text },
  rowSub:   { fontSize: FONT.sm, color: COLORS.textMuted, marginTop: 2 },
  rowPrice: { fontSize: FONT.base, fontWeight: '700', color: COLORS.primary, marginTop: 4 }
})