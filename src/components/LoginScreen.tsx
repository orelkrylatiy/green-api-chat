import { useState, type FormEvent } from 'react'
import type { Credentials } from '../lib/greenApi'

interface Props {
  onSubmit: (c: Credentials) => Promise<void>
}

export default function LoginScreen({ onSubmit }: Props) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!idInstance.trim() || !apiTokenInstance.trim()) {
      setError('Заполните оба поля')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1>GREEN-API Chat</h1>
        <p className="login-hint">
          Введите данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета
          </a>
        </p>
        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="например, 7103894999"
            autoComplete="off"
          />
        </label>
        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="токен инстанса"
            type="password"
            autoComplete="off"
          />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={busy}>
          {busy ? 'Проверка…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
