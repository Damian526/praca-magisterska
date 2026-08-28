import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonImg, IonButton, IonSpinner
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { apiService } from '../core/api'
import { API_URL } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { useCart } from '../core/cart'
import type { Service } from '../core/types'

export default function ServiceDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { add } = useCart()
  const [service, setService] = useState<Service | null>(null)

  // odczyt znacznika z URL (?t=...)
  const measureStart = Number(new URLSearchParams(location.search).get('t')) || undefined

  useEffect(() => {
    (async () => {
      const { data, serverMs } = await apiService(id)
      setService(data)

      // ⭐ WSKAŹNIK 2 — od kliknięcia do gotowego ekranu
      if (measureStart !== undefined) {
        afterPaint(() => {
          record('S2', 'ui_response_ms', now() - measureStart, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: { serviceId: id }
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
            <IonButton expand="block" onClick={() => { add(service); navigate('/cart') }}>
              Dodaj do koszyka
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  )
}