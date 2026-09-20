import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { RootStackParamList } from './types'
import { COLORS } from '../core/theme'

import SplashScreen        from '../screens/SplashScreen'
import LoginScreen         from '../screens/LoginScreen'
import CatalogScreen       from '../screens/CatalogScreen'
import SearchScreen        from '../screens/SearchScreen'
import ServiceDetailScreen from '../screens/ServiceDetailScreen'
import CartScreen          from '../screens/CartScreen'
import CheckoutScreen      from '../screens/CheckoutScreen'
import OrdersScreen        from '../screens/OrdersScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Logowanie' }} />
        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Katalog usług' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Wyszukiwarka' }} />
        <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: 'Szczegóły usługi' }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Koszyk' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Zamówienie' }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Historia zamówień' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}