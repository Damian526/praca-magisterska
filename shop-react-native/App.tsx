import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'react-native'
import { AuthProvider } from './src/core/auth'
import { CartProvider } from './src/core/cart'
import RootNavigator from './src/navigation/RootNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <CartProvider>
          <RootNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}