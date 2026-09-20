import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonThumbnail, IonLabel, IonImg,
  IonInfiniteScroll, IonInfiniteScrollContent,
  type InfiniteScrollCustomEvent
} from '@ionic/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { apiServices } from '../core/api'
import { API_URL, PAGE_SIZE } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record, flush, pendingCount } from '../core/measure'
import { useCart } from '../core/cart'
import type { Service } from '../core/types'
import './Catalog.css'

export default function CatalogScreen() {
  const history = useHistory()
  const { count } = useCart()
  const [items, setItems] = useState<Service[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sent, setSent] = useState(false)
  const startupRecorded = useRef(false)

  const load = useCallback(async (p: number) => {
    const { data, serverMs } = await apiServices({ page: p, limit: PAGE_SIZE })
    setItems(prev => (p === 1 ? data.data : [...prev, ...data.data]))
    setTotalPages(data.meta.totalPages)
    setPage(p)

    if (p === 1 && !startupRecorded.current) {
      startupRecorded.current = true
      afterPaint(() => {
        const startupMs = now() - globalThis.__APP_START__
        record('startup_ms', startupMs, 'ms', {
          serverMs: serverMs ?? undefined,
          extra: { listSize: PAGE_SIZE }
        })
      })
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  const openDetail = useCallback((id: string) => {
    history.push(`/service/${id}?t=${now()}`)
  }, [history])

  const loadMore = useCallback(async (e: InfiniteScrollCustomEvent) => {
    if (page < totalPages) await load(page + 1)
    e.target.complete()
  }, [page, totalPages, load])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Katalog usług</IonTitle>
          <IonButtons slot="end">
            <IonButton id="btn-flush" onClick={async () => { await flush(); setSent(true) }}>
              {sent ? 'Wysłano' : `⏱ ${pendingCount()}`}
            </IonButton>
            <IonButton id="nav-search" onClick={() => history.push('/search')}>Szukaj</IonButton>
            <IonButton id="nav-orders" onClick={() => history.push('/orders')}>Historia</IonButton>
            <IonButton id="nav-cart" onClick={() => history.push('/cart')}>Koszyk ({count})</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {items.map((item, index) => (
            <IonItem id={`service-item-${index}`} key={item.id} button onClick={() => openDetail(item.id)} className="row">
              <IonThumbnail slot="start" className="thumb">
                <IonImg src={`${API_URL}${item.imageUrl}`} />
              </IonThumbnail>
              <IonLabel>
                <h2>{item.name}</h2>
                <p>{item.categoryName} · {item.deliveryTime}</p>
                <p className="price">{formatPrice(item.price)}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        <IonInfiniteScroll onIonInfinite={loadMore} disabled={page >= totalPages}>
          <IonInfiniteScrollContent loadingText="Ładowanie..." />
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  )
}