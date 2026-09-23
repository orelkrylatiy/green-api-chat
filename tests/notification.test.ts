import { describe, expect, it } from 'vitest'
import { messageFromNotification, normalizeChatId, statusFromNotification } from '../src/lib/notification'
import type { Notification } from '../src/lib/notification'

function notif(body: Record<string, unknown>, receiptId = 1): Notification {
  return { receiptId, body: body as Notification['body'] }
}

describe('messageFromNotification', () => {
  it('входящее текстовое сообщение', () => {
    const n = notif({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'AAA',
      timestamp: 1700000000,
      typeMessage: 'textMessage',
      textMessage: 'Привет!',
      chatId: '79001234567@c.us',
    })
    expect(messageFromNotification(n)).toEqual({
      id: 'AAA',
      chatId: '79001234567@c.us',
      text: 'Привет!',
      timestamp: 1700000000000,
      direction: 'in',
    })
  })

  it('подтверждение исходящего через API', () => {
    const n = notif({
      typeWebhook: 'outgoingAPIMessageReceived',
      idMessage: 'BBB',
      timestamp: 1700000050,
      textMessage: 'Ответ',
      chatId: '79001234567@c.us',
    })
    const m = messageFromNotification(n)
    expect(m?.direction).toBe('out')
    expect(m?.status).toBe('sent')
    expect(m?.text).toBe('Ответ')
  })

  it('не-текстовые типы игнорируются', () => {
    const n = notif({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'CCC',
      timestamp: 1700000000,
      typeMessage: 'imageMessage',
      chatId: '79001234567@c.us',
    })
    expect(messageFromNotification(n)).toBeNull()
  })

  it('чужие webhook-и игнорируются', () => {
    expect(messageFromNotification(notif({ typeWebhook: 'deviceInfo' }))).toBeNull()
  })

  it('chatId из MAX (@max.us) нормализуется к @c.us', () => {
    const n = notif({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'D',
      timestamp: 1,
      textMessage: 'hi',
      chatId: '79001234567@max.us',
    })
    expect(messageFromNotification(n)?.chatId).toBe('79001234567@c.us')
  })
})

describe('statusFromNotification', () => {
  it('outgoingMessageStatus mapped', () => {
    const n = notif({
      typeWebhook: 'outgoingMessageStatus',
      idMessage: 'AAA',
      statusMessage: 'read',
    })
    expect(statusFromNotification(n)).toEqual({ idMessage: 'AAA', status: 'read' })
  })

  it('неизвестный статус — null', () => {
    const n = notif({
      typeWebhook: 'outgoingMessageStatus',
      idMessage: 'AAA',
      statusMessage: 'deleted',
    })
    expect(statusFromNotification(n)).toBeNull()
  })
})

describe('normalizeChatId', () => {
  it('без @ не меняется', () => {
    expect(normalizeChatId('123')).toBe('123')
  })
})
