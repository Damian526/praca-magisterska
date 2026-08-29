import { IonApp, IonRoute, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'

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
            <IonRoute path="/"             element={<SplashScreen />} />
            <IonRoute path="/login"        element={<LoginScreen />} />
            <IonRoute path="/catalog"      element={<CatalogScreen />} />
            <IonRoute path="/search"       element={<SearchScreen />} />
            <IonRoute path="/service/:id"  element={<ServiceDetailScreen />} />
            <IonRoute path="/cart"         element={<CartScreen />} />
            <IonRoute path="/checkout"     element={<CheckoutScreen />} />
            <IonRoute path="/orders"       element={<OrdersScreen />} />
          </IonRouterOutlet>
        </IonReactRouter>
        </CartProvider>
      </AuthProvider>
    </IonApp>
  )
}