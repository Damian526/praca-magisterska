import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Redirect } from 'react-router-dom'

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
            <Route exact path="/"            component={SplashScreen} />
            <Route exact path="/login"       component={LoginScreen} />
            <Route exact path="/catalog"     component={CatalogScreen} />
            <Route exact path="/search"      component={SearchScreen} />
            <Route exact path="/service/:id" component={ServiceDetailScreen} />
            <Route exact path="/cart"        component={CartScreen} />
            <Route exact path="/checkout"    component={CheckoutScreen} />
            <Route exact path="/orders"      component={OrdersScreen} />
            <Route render={() => <Redirect to="/" />} />
          </IonRouterOutlet>
        </IonReactRouter>
        </CartProvider>
      </AuthProvider>
    </IonApp>
  )
}