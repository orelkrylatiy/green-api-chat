import { useCallback, useEffect, useRef, useState } from 'react'
import type { Credentials } from './lib/greenApi'
import { getStateInstance, receiveNotification, sendMessage } from './lib/greenApi'
import type { ChatMessage } from './lib/notification'
import { messageFromNotification, statusFromNotification } from './lib/notification'
import type { Notification } from './lib/notification'
import { phoneToChatId } from './lib/phone'
import LoginScreen from './components/LoginScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

const POLL_INTERVAL_MS = 4000

interface Chat {
  chatId: string
  title: string
}

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const timerRef = useRef<number | null>(null)
  const credsRef = useRef<Credentials | null>(null)
  const stopRef = useRef(false)

  useEffect(() => {
    credsRef.current = credentials
  }, [credentials])

  const upsertMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const list = prev[msg.chatId] ?? []
      // не дублируем по id
      if (list.some((m) => m.id === msg.id)) return prev
      return { ...prev, [msg.chatId]: [...list, msg] }
    })
  }, [])

  const addChat = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.some((c) => c.chatId === chatId)
        ? prev
        : [...prev, { chatId, title: chatId }],
    )
  }, [])

  // Polling receiveNotification
  const poll = useCallback(async () => {
    const c = credsRef.current
    if (!c || stopRef.current) return
    try {
      // забираем все доступные notification-ы подряд
      for (let i = 0; i < 10; i++) {
        const n = (await receiveNotification(c)) as Notification | null
        if (!n) break
        const msg = messageFromNotification(n)
        if (msg) {
          upsertMessage(msg)
          addChat(msg.chatId)
        }
        const st = statusFromNotification(n)
        if (st) {
          setMessages((prev) => {
            const next: typeof prev = {}
            for (const [chat, list] of Object.entries(prev)) {
              next[chat] = list.map((m) =>
                m.id === st.idMessage ? { ...m, status: st.status } : m,
              )
            }
            return next
          })
        }
      }
      setError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    }
  }, [addChat, upsertMessage])

  useEffect(() => {
    if (!credentials) return
    stopRef.current = false
    setPolling(true)
    poll()
    timerRef.current = window.setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      stopRef.current = true
      setPolling(false)
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [credentials, poll])

  const handleLogin = async (c: Credentials) => {
    // getStateInstance проверит и токен, и состояние инстанса
    await getStateInstance(c)
    setCredentials(c)
  }

  const handleCreateChat = (phone: string) => {
    const chatId = phoneToChatId(phone)
    if (!chatId) {
      setError('Некорректный номер телефона')
      return null
    }
    addChat(chatId)
    setActiveChatId(chatId)
    setError(null)
    return chatId
  }

  const handleSend = async (text: string) => {
    if (!credentials || !activeChatId) return
    const tempId = `pending-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      chatId: activeChatId,
      text,
      timestamp: Date.now(),
      direction: 'out',
      status: 'pending',
    }
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] ?? []), optimistic],
    }))
    try {
      const { idMessage } = await sendMessage(credentials, activeChatId, text)
      setMessages((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] ?? []).map((m) =>
          m.id === tempId ? { ...m, id: idMessage, status: 'sent' as const } : m,
        ),
      }))
      setError(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setMessages((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] ?? []).map((m) =>
          m.id === tempId ? { ...m, status: 'pending', error: true } : m,
        ),
      }))
      throw e
    }
  }

  const handleLogout = () => {
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setMessages({})
    setError(null)
  }

  if (!credentials) {
    return <LoginScreen onSubmit={handleLogin} />
  }

  const activeMessages = activeChatId ? messages[activeChatId] ?? [] : []

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={setActiveChatId}
        onCreate={handleCreateChat}
        onLogout={handleLogout}
        polling={polling}
      />
      {activeChatId ? (
        <ChatWindow
          key={activeChatId}
          chatId={activeChatId}
          messages={activeMessages}
          onSend={handleSend}
        />
      ) : (
        <div className="empty-state">
          Выберите чат или создайте новый по номеру телефона
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
