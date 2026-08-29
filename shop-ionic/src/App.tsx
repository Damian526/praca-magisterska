import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './core/auth'
import { CartProvider } from './core/cart'

import SplashScreen        from './screens/SplashScreen'
import LoginScreen         from './screens/LoginScreen'
import CatalogScreen       from './screens/CatalogScreen'
import SearchScreen        from './screens/SearchScreen'
import ServiceDetailScreen from './screens/ServiceDetailsScreen'
import CartScreen          from './screens/CartScreen'
import CheckoutScreen      from './screens/CheckoutScreen'
import OrdersScreen        from './screens/OrdersScreen'

/* wymagane style Ionica */
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import './theme/variables.css'

setupIonicReact()

export default function App() {
  return (
    <IonApp>
      <AuthProvider>
        <CartProvider>
          <IonReactRouter>
            <IonRouterOutlet>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/catalog" element={<CatalogScreen />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/service/:id" element={<ServiceDetailScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/checkout" element={<CheckoutScreen />} />
              <Route path="/orders" element={<OrdersScreen />} />
              <Route path="*" element={<Navigate to="/" />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </CartProvider>
      </AuthProvider>
    </IonApp>
  )
}