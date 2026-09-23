import { useState, type FormEvent } from 'react'
import { chatIdToTitle } from '../lib/phone'

interface Props {
  chats: { chatId: string }[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onCreate: (phone: string) => string | null
  onLogout: () => void
  polling: boolean
}

export default function Sidebar({ chats, activeChatId, onSelect, onCreate, onLogout, polling }: Props) {
  const [phone, setPhone] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const create = (e: FormEvent) => {
    e.preventDefault()
    const chatId = onCreate(phone)
    if (chatId) {
      setPhone('')
      setErr(null)
    } else {
      setErr('Введите номер, например +79001234567')
    }
  }

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <span className="logo">GA Chat</span>
        <button className="logout" onClick={onLogout} title="Выйти">
          Выйти
        </button>
      </header>

      <form className="new-chat" onSubmit={create}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Номер телефона: +79001234567"
        />
        <button type="submit">Создать чат</button>
      </form>
      {err && <div className="new-chat-error">{err}</div>}

      <div className="polling-indicator">
        <span className={polling ? 'dot on' : 'dot'} /> {polling ? 'получение сообщений' : 'пауза'}
      </div>

      <nav className="chat-list">
        {chats.length === 0 && <div className="chat-list-empty">Чатов пока нет</div>}
        {chats.map((c) => (
          <button
            key={c.chatId}
            className={c.chatId === activeChatId ? 'chat-item active' : 'chat-item'}
            onClick={() => onSelect(c.chatId)}
          >
            <span className="avatar">{chatIdToTitle(c.chatId).slice(-2)}</span>
            <span className="chat-item-title">{chatIdToTitle(c.chatId)}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
