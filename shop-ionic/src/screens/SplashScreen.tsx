import { IonPage, IonContent, IonSpinner } from '@ionic/react'
import { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../core/auth'

export default function SplashScreen() {
  const { user, ready } = useAuth()
  const history = useHistory()

  useEffect(() => {
    if (!ready) return
    history.replace(user ? '/catalog' : '/login')
  }, [ready, user, history])

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ textAlign: 'center' }}>
        <h1 style={{ marginTop: '40%', color: 'var(--app-text)' }}>Sklep Usług Cyfrowych</h1>
        <IonSpinner name="crescent" />
      </IonContent>
    </IonPage>
  )
}