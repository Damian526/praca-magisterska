import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonList, IonItem, IonLabel, IonButton, IonFooter, IonText
} from '@ionic/react'
import { useHistory } from 'react-router-dom'
import { useCart } from '../core/cart'
import { formatPrice } from '../core/format'

export default function CartScreen() {
  const history = useHistory()
  const { lines, setQty, remove, total } = useCart()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/catalog" /></IonButtons>
          <IonTitle>Koszyk</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {lines.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--app-muted)', marginTop: 'var(--sp-xl)' }}>
            Koszyk jest pusty
          </p>
        ) : (
          <IonList>
            {lines.map(l => (
              <IonItem key={l.service.id}>
                <IonLabel>
                  <h2>{l.service.name}</h2>
                  <p>{formatPrice(l.service.price)} × {l.quantity}</p>
                </IonLabel>
                <IonButton slot="end" fill="clear" onClick={() => setQty(l.service.id, l.quantity - 1)}>−</IonButton>
                <IonText slot="end">{l.quantity}</IonText>
                <IonButton slot="end" fill="clear" onClick={() => setQty(l.service.id, l.quantity + 1)}>+</IonButton>
                <IonButton slot="end" fill="clear" color="danger" onClick={() => remove(l.service.id)}>Usuń</IonButton>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonTitle>Razem: {formatPrice(total)}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              id="btn-checkout"
              fill="solid"
              disabled={lines.length === 0}
              onClick={() => history.push('/checkout')}
            >
              Przejdź do zamówienia
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}