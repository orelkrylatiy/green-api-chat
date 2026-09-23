/** Тонкий клиент GREEN-API: только то, что нужно чату. */

export interface Credentials {
  idInstance: string
  apiTokenInstance: string
}

export class GreenApiError extends Error {
  /** true — ошибка авторизации (неверный idInstance/token) */
  auth: boolean
  constructor(message: string, auth = false) {
    super(message)
    this.name = 'GreenApiError'
    this.auth = auth
  }
}

function baseUrl(c: Credentials): string {
  return `https://api.green-api.com/waInstance${c.idInstance}`
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch {
    throw new GreenApiError('Нет соединения с api.green-api.com (проверьте сеть)')
  }
  if (res.status === 401 || res.status === 403) {
    throw new GreenApiError('Ошибка авторизации: проверьте idInstance и apiTokenInstance', true)
  }
  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.message ? `: ${j.message}` : ''
    } catch {
      /* ignore */
    }
    throw new GreenApiError(`GREEN-API вернул ${res.status}${detail}`)
  }
  return (await res.json()) as T
}

/** Проверка инстанса: getStateInstance. Бросает GreenApiError с auth=true при 401/403. */
export function getStateInstance(c: Credentials): Promise<{
  stateInstance: string
}> {
  return request(`${baseUrl(c)}/getStateInstance/${c.apiTokenInstance}`)
}

export function sendMessage(
  c: Credentials,
  chatId: string,
  message: string,
): Promise<{ idMessage: string }> {
  return request(`${baseUrl(c)}/sendMessage/${c.apiTokenInstance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })
}

/** Получить и удалить один notification. null — пусто. */
export function receiveNotification<T = unknown>(c: Credentials): Promise<T | null> {
  // DELETE-запрос, но green-api отдаёт notification и на GET — используем DELETE как в доках
  return request<T | null>(`${baseUrl(c)}/receiveNotification/${c.apiTokenInstance}`, {
    method: 'DELETE',
  }).then((v) => (v as null) ?? null)
}
