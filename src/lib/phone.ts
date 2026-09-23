/** Форматирование номера телефона в chatId GREEN-API. */

/**
 * Приводит пользовательский ввод номера телефона к формату chatId.
 * Принимает: 79001234567, 89001234567, +7 900 123-45-67, 9001234567.
 * Возвращает "79001234567@c.us" или null, если номер невалиден
 * (длина цифр вне 10–15, или есть посторонние символы).
 */
export function phoneToChatId(input: string): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  if (!/^[+\d\s()\-]+$/.test(trimmed)) return null

  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    digits = '7' + digits.slice(1)
  } else if (digits.length === 10) {
    // местный формат 9001234567 -> 79001234567
    digits = '7' + digits
  }
  if (digits.length < 10 || digits.length > 15) return null
  if (!/^\d+$/.test(digits)) return null
  return `${digits}@c.us`
}

/** Короткое представление чата для списка: +7 900 123-45-67. */
export function chatIdToTitle(chatId: string): string {
  const digits = chatId.replace(/@.*/, '')
  const m = digits.match(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/)
  if (!m) return digits
  return `+${m[1]} ${m[2]} ${m[3]}-${m[4]}-${m[5]}`
}
