/**
 * Парсинг notification-ов GREEN-API (receiveNotification).
 * Схема: { receiptId, body: { typeWebhook, ... } }
 * Нас интересуют:
 *  - incomingMessageReceived — входящее текстовое сообщение
 *  - outgoingAPIMessageReceived — подтверждение сообщения, отправленного через API
 *  - outgoingMessageStatus — смена статуса исходящего (sent/delivered/read)
 */

export interface ChatMessage {
  id: string
  chatId: string
  text: string
  /** timestamp в мс */
  timestamp: number
  direction: 'out' | 'in'
  status?: 'pending' | 'sent' | 'delivered' | 'read'
  /** true — отправка не удалась */
  error?: boolean
}

interface NotificationMessageData {
  idMessage?: string
  timestamp?: number
  typeMessage?: string
  textMessage?: string
  chatId?: string
  senderId?: string
  statusMessage?: string
  sendByApi?: boolean
}

export interface NotificationBody extends NotificationMessageData {
  typeWebhook: string
  instanceData?: { idInstance: number; wid?: string }
}

export interface Notification {
  receiptId: number
  body: NotificationBody
}

/** Извлекает текстовое сообщение из notification или null. */
export function messageFromNotification(n: Notification): ChatMessage | null {
  const b = n.body
  if (!b || !b.chatId) return null

  if (b.typeWebhook === 'incomingMessageReceived') {
    if (b.typeMessage && b.typeMessage !== 'textMessage') return null
    const text = b.textMessage ?? ''
    if (!text) return null
    return {
      id: b.idMessage ?? `in-${n.receiptId}`,
      chatId: normalizeChatId(b.chatId),
      text,
      timestamp: (b.timestamp ?? Date.now() / 1000) * 1000,
      direction: 'in',
    }
  }

  if (b.typeWebhook === 'outgoingAPIMessageReceived') {
    if (b.typeMessage && b.typeMessage !== 'textMessage') return null
    const text = b.textMessage ?? ''
    if (!text) return null
    return {
      id: b.idMessage ?? `out-${n.receiptId}`,
      chatId: normalizeChatId(b.chatId),
      text,
      timestamp: (b.timestamp ?? Date.now() / 1000) * 1000,
      direction: 'out',
      status: 'sent',
    }
  }

  return null
}

/** Статус исходящего сообщения из outgoingMessageStatus, либо null. */
export function statusFromNotification(
  n: Notification,
): { idMessage: string; status: ChatMessage['status'] } | null {
  const b = n.body
  if (!b || b.typeWebhook !== 'outgoingMessageStatus') return null
  const map: Record<string, ChatMessage['status']> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
  }
  const status = b.statusMessage ? map[b.statusMessage] : undefined
  if (!b.idMessage || !status) return null
  return { idMessage: b.idMessage, status }
}

/** "79001234567@c.us" и "79001234567@max.us" приводим к одному ключу "@c.us". */
export function normalizeChatId(chatId: string): string {
  const at = chatId.lastIndexOf('@')
  if (at === -1) return chatId
  return chatId.slice(0, at) + '@c.us'
}
