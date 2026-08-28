import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonInput, IonButton, IonText, IonSpinner
} from '@ionic/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../core/auth'
import { TEST_USER } from '../core/config'

export default function LoginScreen() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(TEST_USER.email)
  const [password, setPassword] = useState(TEST_USER.password)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(mode: 'login' | 'register') {
    setBusy(true); setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password, TEST_USER.fullName)
      navigate('/catalog', { replace: true })
    } catch (e: any) {
      setError(e.message ?? 'Nie udało się zalogować')
    } finally {
      setBusy(false)
    }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Logowanie</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonInput
          label="Adres e-mail" labelPlacement="stacked" fill="outline"
          type="email" value={email}
          onIonInput={e => setEmail(e.detail.value!)}
        />
        <IonInput
          label="Hasło" labelPlacement="stacked" fill="outline"
          type="password" value={password}
          onIonInput={e => setPassword(e.detail.value!)}
          style={{ marginTop: 'var(--sp-md)' }}
        />

        {error && <IonText color="danger"><p>{error}</p></IonText>}

        <IonButton expand="block" onClick={() => run('login')} disabled={busy}
                   style={{ marginTop: 'var(--sp-lg)' }}>
          {busy ? <IonSpinner /> : 'Zaloguj się'}
        </IonButton>
        <IonButton expand="block" fill="outline" onClick={() => run('register')} disabled={busy}>
          Załóż konto testowe
        </IonButton>
      </IonContent>
    </IonPage>
  )
}