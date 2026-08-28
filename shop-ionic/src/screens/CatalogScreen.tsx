import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonThumbnail, IonLabel, IonImg,
  IonInfiniteScroll, IonInfiniteScrollContent
} from '@ionic/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiServices } from '../core/api'
import { API_URL, PAGE_SIZE } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import { useCart } from '../core/cart'
import type { Service } from '../core/types'
import './Catalog.css'

export default function CatalogScreen() {
  const navigate = useNavigate()
  const { count } = useCart()
  const [items, setItems] = useState<Service[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const startupRecorded = useRef(false)

  const load = useCallback(async (p: number) => {
    const { data, serverMs } = await apiServices({ page: p, limit: PAGE_SIZE })
    setItems(prev => (p === 1 ? data.data : [...prev, ...data.data]))
    setTotalPages(data.meta.totalPages)
    setPage(p)

    // ⭐ WSKAŹNIK 1 — czas uruchomienia (tylko pierwsza strona)
    if (p === 1 && !startupRecorded.current) {
      startupRecorded.current = true
      afterPaint(() => {
        const startupMs = now() - (globalThis as any).__APP_START__
        record('S1', 'startup_ms', startupMs, 'ms', {
          serverMs: serverMs ?? undefined,
          extra: { listSize: PAGE_SIZE }
        })
      })
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  // ⭐ WSKAŹNIK 2 — znacznik z momentu kliknięcia w URL
  const openDetail = useCallback((id: string) => {
    navigate(`/service/${id}?t=${now()}`)
  }, [navigate])

  // doładowanie kolejnej strony (odpowiednik onEndReached z FlatList)
  const loadMore = useCallback(async (e: any) => {
    if (page < totalPages) await load(page + 1)
    e.target.complete()   // WYMAGANE: mówi IonInfiniteScroll, że skończył
  }, [page, totalPages, load])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/search')}>Szukaj</IonButton>
            <IonButton onClick={() => navigate('/orders')}>Historia</IonButton>
            <IonButton onClick={() => navigate('/cart')}>Koszyk ({count})</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonList>
          {items.map(item => (
            <IonItem key={item.id} button onClick={() => openDetail(item.id)} className="row">
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