import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatMessage } from '../lib/notification'
import { chatIdToTitle } from '../lib/phone'

interface Props {
  chatId: string
  messages: ChatMessage[]
  onSend: (text: string) => Promise<void>
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function StatusTick({ m }: { m: ChatMessage }) {
  if (m.direction !== 'out') return null
  if (m.status === 'pending') return <span className="tick">🕓</span>
  if (m.status === 'read') return <span className="tick">✓✓</span>
  if (m.status === 'delivered') return <span className="tick">✓✓</span>
  return <span className="tick">✓</span>
}

export default function ChatWindow({ chatId, messages, onSend }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      await onSend(value)
      setText('')
    } catch {
      /* ошибка показана в баннере, сообщение помечено как не отправленное */
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="chat">
      <header className="chat-header">
        <span className="avatar big">{chatIdToTitle(chatId).slice(-2)}</span>
        <div>
          <div className="chat-header-title">{chatIdToTitle(chatId)}</div>
          <div className="chat-header-sub">через GREEN-API</div>
        </div>
      </header>

      <div className="messages" ref={listRef}>
        {messages.length === 0 && (
          <div className="messages-empty">Нет сообщений. Напишите первое!</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.direction === 'out' ? 'bubble out' : 'bubble in'}>
            <div className="bubble-text">{m.text}</div>
            <div className="bubble-meta">
              {formatTime(m.timestamp)} <StatusTick m={m} />
            </div>
          </div>
        ))}
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение…"
        />
        <button type="submit" disabled={sending || !text.trim()}>
          {sending ? '…' : 'Отправить'}
        </button>
      </form>
    </main>
  )
}
