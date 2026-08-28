import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonSearchbar, IonChip, IonLabel, IonList, IonItem, IonSpinner
} from '@ionic/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiServices, apiCategories } from '../core/api'
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../core/config'
import { formatPrice } from '../core/format'
import { now, afterPaint, record } from '../core/measure'
import type { Service, Category } from '../core/types'
import './Search.css'

export default function SearchScreen() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | undefined>()
  const [cats, setCats] = useState<Category[]>([])
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { apiCategories().then(r => setCats(r.data)) }, [])

  // debounce — ta sama wartość SEARCH_DEBOUNCE_MS co w RN
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const t0 = now()
      setLoading(true)
      try {
        const { data, serverMs } = await apiServices({ q: q || undefined, category: cat, limit: PAGE_SIZE })
        setItems(data.data)
        afterPaint(() => {
          record('S3', 'render_ms', now() - t0, 'ms', {
            serverMs: serverMs ?? undefined,
            extra: { query: q, category: cat ?? null, resultCount: data.data.length }
          })
        })
      } finally { setLoading(false) }
    }, SEARCH_DEBOUNCE_MS)

    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q, cat])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/catalog" /></IonButtons>
          <IonTitle>Wyszukiwarka</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonSearchbar
          value={q}
          onIonInput={e => setQ(e.detail.value ?? '')}
          placeholder="Szukaj usługi..."
          debounce={0}                {/* debounce robimy sami w useEffect */}
        />

        {/* poziomy pasek kategorii — chipy */}
        <div className="chips">
          <IonChip
            outline={cat !== undefined}
            color={cat === undefined ? 'primary' : undefined}
            onClick={() => setCat(undefined)}
          >
            <IonLabel>Wszystkie</IonLabel>
          </IonChip>
          {cats.map(c => (
            <IonChip
              key={c.id}
              outline={cat !== c.slug}
              color={cat === c.slug ? 'primary' : undefined}
              onClick={() => setCat(c.slug)}
            >
              <IonLabel>{c.name}</IonLabel>
            </IonChip>
          ))}
        </div>

        {loading && <IonSpinner style={{ display: 'block', margin: 'var(--sp-md) auto' }} />}

        <IonList>
          {items.map(item => (
            <IonItem
              key={item.id}
              button
              onClick={() => navigate(`/service/${item.id}?t=${now()}`)}
              className="row"
            >
              <IonLabel>
                <h2>{item.name}</h2>
                <p className="price">{formatPrice(item.price)}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {!loading && items.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--app-muted)', marginTop: 'var(--sp-xl)' }}>
            Brak wyników
          </p>
        )}
      </IonContent>
    </IonPage>
  )
}