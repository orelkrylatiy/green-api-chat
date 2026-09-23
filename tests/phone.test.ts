import { describe, expect, it } from 'vitest'
import { chatIdToTitle, phoneToChatId } from '../src/lib/phone'

describe('phoneToChatId', () => {
  it('простой номер с +', () => {
    expect(phoneToChatId('+79001234567')).toBe('79001234567@c.us')
  })

  it('номер с пробелами, дефисами и скобками', () => {
    expect(phoneToChatId('+7 (900) 123-45-67')).toBe('79001234567@c.us')
  })

  it('восьмёрка заменяется на семёрку', () => {
    expect(phoneToChatId('89001234567')).toBe('79001234567@c.us')
  })

  it('десятизначный локальный номер дополняется 7', () => {
    expect(phoneToChatId('9001234567')).toBe('79001234567@c.us')
  })

  it('международный номер не из РФ', () => {
    expect(phoneToChatId('4930555001234')).toBe('4930555001234@c.us')
  })

  it('пустая строка', () => {
    expect(phoneToChatId('')).toBeNull()
  })

  it('буквы и мусор', () => {
    expect(phoneToChatId('abc')).toBeNull()
    expect(phoneToChatId('+7900123456abc')).toBeNull()
  })

  it('слишком короткий номер', () => {
    expect(phoneToChatId('12345')).toBeNull()
  })
})

describe('chatIdToTitle', () => {
  it('российский номер', () => {
    expect(chatIdToTitle('79001234567@c.us')).toBe('+7 900 123-45-67')
  })

  it('неизвестный формат — просто цифры', () => {
    expect(chatIdToTitle('4930555001234@c.us')).toBe('4930555001234')
  })
})
