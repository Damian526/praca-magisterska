import React, { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useAuth } from '../core/auth'
import { COLORS, FONT, SPACING } from '../core/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>

export default function SplashScreen({ navigation }: Props) {
  const { user, ready } = useAuth()

  useEffect(() => {
    if (!ready) return
    navigation.replace(user ? 'Catalog' : 'Login')
  }, [ready, user, navigation])

  return (
    <View style={s.wrap}>
      <Text style={s.logo}>Sklep Usług Cyfrowych</Text>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  logo: { fontSize: FONT.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xl }
})