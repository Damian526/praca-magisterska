import { IonPage, IonContent, IonSpinner } from '@ionic/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../core/auth'

export default function SplashScreen() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    // Czekamy, aż <ion-router-outlet> faktycznie się zdefiniuje (Stencil
    // podłącza go asynchronicznie) — redirect wystrzelony wcześniej potrafi
    // trwale rozjechać outlet z historią reacta (nawigacja przestaje działać
    // po zimnym starcie, mimo że history.length rośnie).
    customElements.whenDefined('ion-router-outlet').then(() => {
      if (cancelled) return
      // replace, nie push — splash znika z historii (jak replace w RN)
      navigate(user ? '/catalog' : '/login', { replace: true })
    })
    return () => { cancelled = true }
  }, [ready, user, navigate])

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ textAlign: 'center' }}>
        <h1 style={{ marginTop: '40%', color: 'var(--app-text)' }}>Sklep Usług Cyfrowych</h1>
        <IonSpinner name="crescent" />
      </IonContent>
    </IonPage>
  )
}