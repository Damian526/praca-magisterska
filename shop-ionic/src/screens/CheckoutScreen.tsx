import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonInput, IonButton, IonText, IonSpinner
} from '@ionic/react'
import { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useCart } from '../core/cart'
import { useAuth } from '../core/auth'
import { apiCreateOrder } from '../core/api'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'

export default function CheckoutScreen() {
  const history = useHistory()
  const { lines, total, clear } = useCart()
  const { user } = useAuth()
  const [name, setName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true); setError(null)

    const t0 = now()
    const body = {
      items: lines.map(l => ({ serviceId: l.service.id, quantity: l.quantity })),
      customerName: name,
      customerEmail: email
    }
    const t1 = now()

    try {
      const { serverMs, totalMs } = await apiCreateOrder(body)
      const t2 = now()

      record('request_build_ms', t1 - t0)
      record('api_request_ms', t2 - t1, 'ms', {
        serverMs: serverMs ?? undefined,
        extra: { totalMs }
      })

      clear()
      afterPaint(() => {
        record('render_checkout_ms', now() - t2)
      })
      history.replace('/orders')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Nie udało się złożyć zamówienia'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/cart" /></IonButtons>
          <IonTitle>Zamówienie</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonInput
          label="Imię i nazwisko" labelPlacement="stacked" fill="outline"
          value={name} onIonInput={e => setName(e.detail.value!)}
        />
        <IonInput
          label="Adres e-mail" labelPlacement="stacked" fill="outline"
          type="email" value={email}
          onIonInput={e => setEmail(e.detail.value!)}
          style={{ marginTop: 'var(--sp-md)' }}
        />

        <p style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, marginTop: 'var(--sp-xl)' }}>
          Do zapłaty: {formatPrice(total)}
        </p>

        {error && <IonText color="danger"><p>{error}</p></IonText>}

        <IonButton id="btn-submit-order" expand="block" onClick={submit} disabled={busy || lines.length === 0}>
          {busy ? <IonSpinner /> : 'Złóż zamówienie'}
        </IonButton>
      </IonContent>
    </IonPage>
  )
}