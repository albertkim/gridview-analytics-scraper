import { customAlphabet } from 'nanoid'

export function generateID(prefix: 'raw' | 'rez' | 'news') {
  return `${prefix}-${customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz')()}`
}
