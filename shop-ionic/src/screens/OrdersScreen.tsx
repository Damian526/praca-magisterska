import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonCard, IonCardHeader, IonCardContent, IonSpinner
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { apiOrders } from '../core/api'
import { formatPrice, formatDate } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import type { Order } from '../core/types'

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const t0 = now()
      try {
        const { data, serverMs } = await apiOrders(1, 20)
        const tData = now()
        setOrders(data.data)
        afterPaint(() => {
          record('render_orders_ms', now() - tData, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: {
              count: data.data.length,
              apiMs: Math.round((tData - t0) * 1000) / 1000
            }
          })
        })
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/catalog" /></IonButtons>
          <IonTitle>Historia zamówień</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <IonSpinner style={{ display: 'block', margin: '40% auto' }} />
        ) : orders.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--app-muted)', marginTop: 'var(--sp-xl)' }}>
            Brak zamówień
          </p>
        ) : (
          orders.map(o => (
            <IonCard key={o.id}>
              <IonCardHeader>
                <p style={{ color: 'var(--app-muted)', fontSize: 'var(--fs-sm)' }}>{formatDate(o.createdAt)}</p>
                <p style={{ color: 'var(--app-success)', fontWeight: 600 }}>{o.status}</p>
              </IonCardHeader>
              <IonCardContent>
                {o.items.map(it => (
                  <p key={it.serviceId}>{it.serviceName} × {it.quantity}</p>
                ))}
                <p style={{ color: 'var(--app-primary)', fontSize: 'var(--fs-lg)', fontWeight: 700, marginTop: 'var(--sp-md)' }}>
                  {formatPrice(o.total)}
                </p>
              </IonCardContent>
            </IonCard>
          ))
        )}
      </IonContent>
    </IonPage>
  )
}