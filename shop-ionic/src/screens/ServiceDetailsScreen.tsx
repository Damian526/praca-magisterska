import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonImg, IonButton, IonSpinner
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { useParams, useLocation, useHistory } from 'react-router-dom'
import { apiService } from '../core/api'
import { API_URL } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { useCart } from '../core/cart'
import type { Service } from '../core/types'

export default function ServiceDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const history = useHistory()
  const { add } = useCart()
  const [service, setService] = useState<Service | null>(null)

  // odczyt znacznika z URL (?t=...)
  const measureStart = Number(new URLSearchParams(location.search).get('t')) || undefined

  useEffect(() => {
    (async () => {
      const tRequest = now()
      const { data, serverMs } = await apiService(id!)
      const tData = now()
      setService(data)

      // ⭐ WSKAŹNIK 2 — kliknięcie -> gotowy ekran. Z czasem sieci w środku;
      //    rozbicie idzie do `extra`.
      if (measureStart !== undefined) {
        afterPaint(() => {
          const tPainted = now()
          record('ui_response_ms', tPainted - measureStart, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: {
              serviceId: id,
              apiMs: Math.round((tData - tRequest) * 1000) / 1000,
              renderMs: Math.round((tPainted - tData) * 1000) / 1000
            }
          })
        })
      }
    })()
  }, [id])   // measureStart celowo pominięte — mierzymy raz, przy wejściu

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/catalog" /></IonButtons>
          <IonTitle>Szczegóły usługi</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!service ? <IonSpinner /> : (
          <>
            <IonImg src={`${API_URL}${service.imageUrl}`} style={{ height: 220, objectFit: 'cover' }} />
            <h1>{service.name}</h1>
            <p style={{ color: 'var(--app-muted)' }}>
              {service.categoryName} · realizacja {service.deliveryTime} · ocena {service.rating}
            </p>
            <p style={{ color: 'var(--app-primary)', fontSize: 'var(--fs-xl)', fontWeight: 700 }}>
              {formatPrice(service.price)}
            </p>
            <p>{service.description}</p>
            <IonButton id="btn-add-to-cart" expand="block" onClick={() => { add(service); history.push('/cart') }}>
              Dodaj do koszyka
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}