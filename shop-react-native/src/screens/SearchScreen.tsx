import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { apiServices, apiCategories } from '../core/api'
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { COLORS, FONT, SPACING, RADIUS, LIST_ITEM_HEIGHT } from '../core/theme'
import type { Service, Category } from '../core/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>

export default function SearchScreen({ navigation }: Props) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | undefined>()
  const [cats, setCats] = useState<Category[]>([])
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { apiCategories().then(r => setCats(r.data)) }, [])

  // Debounce — identyczna wartość w obu apkach (SEARCH_DEBOUNCE_MS)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const t0 = now()
      setLoading(true)
      try {
        const { data, serverMs } = await apiServices({ q: q || undefined, category: cat, limit: PAGE_SIZE })
        const tData = now()
        setItems(data.data)
        afterPaint(() => {
          record('render_search_ms', now() - tData, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: {
              query: q,
              category: cat ?? null,
              resultCount: data.data.length,
              apiMs: Math.round((tData - t0) * 1000) / 1000
            }
          })
        })
      } finally { setLoading(false) }
    }, SEARCH_DEBOUNCE_MS)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q, cat])

  return (
    <View style={s.wrap}>
      <TextInput
        style={s.input} value={q} onChangeText={setQ}
        placeholder="Szukaj usługi..." placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
      />

      <FlatList
        horizontal data={[{ id: '', name: 'Wszystkie', slug: '', count: 0 }, ...cats]}
        keyExtractor={c => c.id || 'all'}
        showsHorizontalScrollIndicator={false}
        style={s.chips}
        renderItem={({ item }) => {
          const active = (item.slug || undefined) === cat
          return (
            <Pressable
              style={[s.chip, active && s.chipOn]}
              onPress={() => setCat(item.slug || undefined)}
            >
              <Text style={[s.chipTxt, active && s.chipTxtOn]}>{item.name}</Text>
            </Pressable>
          )
        }}
      />

      {loading && <ActivityIndicator style={{ marginVertical: SPACING.md }} />}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        getItemLayout={(_, index) => ({ length: LIST_ITEM_HEIGHT, offset: LIST_ITEM_HEIGHT * index, index })}
        renderItem={({ item }) => (
          <Pressable
            style={s.row}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id, measureStart: now() })}
          >
            <Text style={s.rowTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={s.rowPrice}>{formatPrice(item.price)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Brak wyników</Text> : undefined}
      />
    </View>
  )
}

const s = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: COLORS.bg },
  input: {
    margin: SPACING.lg, backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: RADIUS.sm, height: 46,
    paddingHorizontal: SPACING.md, fontSize: FONT.base, color: COLORS.text
  },
  chips:   { maxHeight: 44, paddingLeft: SPACING.lg },
  chip:    { paddingHorizontal: SPACING.md, height: 34, justifyContent: 'center',
             borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1,
             borderColor: COLORS.border, marginRight: SPACING.sm },
  chipOn:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { fontSize: FONT.sm, color: COLORS.text },
  chipTxtOn: { color: '#fff', fontWeight: '600' },
  row: { height: LIST_ITEM_HEIGHT, justifyContent: 'center', paddingHorizontal: SPACING.lg,
         backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowTitle: { fontSize: FONT.base, color: COLORS.text, fontWeight: '600' },
  rowPrice: { fontSize: FONT.sm, color: COLORS.primary, marginTop: 4, fontWeight: '700' },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl }
})