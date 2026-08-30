import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { useAuth } from '../core/auth'
import { TEST_USER } from '../core/config'
import { COLORS, FONT, SPACING, RADIUS } from '../core/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const { login, register } = useAuth()
  const [email, setEmail] = useState(TEST_USER.email)
  const [password, setPassword] = useState(TEST_USER.password)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(mode: 'login' | 'register') {
    setBusy(true); setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, TEST_USER.fullName)
      navigation.replace('Catalog')
    } catch (e: any) {
      setError(e.message ?? 'Nie udało się zalogować')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Adres e-mail</Text>
      <TextInput
        style={s.input} value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
      />

      <Text style={s.label}>Hasło</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={s.error}>{error}</Text>}

      <Pressable style={s.btn} onPress={() => run('login')} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Zaloguj się</Text>}
      </Pressable>

      <Pressable style={[s.btn, s.btnGhost]} onPress={() => run('register')} disabled={busy}>
        <Text style={[s.btnTxt, { color: COLORS.primary }]}>Załóż konto testowe</Text>
      </Pressable>
    </View>
  )
}

const s = StyleSheet.create({
  wrap:  { flex: 1, padding: SPACING.lg, backgroundColor: COLORS.bg },
  label: { fontSize: FONT.sm, color: COLORS.textMuted, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, height: 46,
    fontSize: FONT.base, color: COLORS.text
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, height: 48,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary },
  btnTxt: { color: '#fff', fontSize: FONT.base, fontWeight: '600' },
  error: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.md }
})