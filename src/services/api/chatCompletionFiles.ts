import type { TranslationMessage } from '../../i18n/index.js'
import { getAbortReason, throwIfAborted } from '../../utils/abort.js'
import { getFileExt, MAX_COUNT } from '../attachments.js'
import { ApiError, type ChatCompletionPart } from './client.js'

const FILE_TYPES = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['pdf', 'application/pdf'],
  ['md', 'text/plain'],
  ['markdown', 'text/plain'],
  ['txt', 'text/plain'],
  ['html', 'text/plain'],
  ['htm', 'text/plain'],
])

export const CHAT_COMPLETION_FILE_ACCEPT = [...FILE_TYPES.keys()].map((ext) => `.${ext}`).join(',')
export const CHAT_COMPLETION_FILE_LIMIT_MB = 32
export const CHAT_COMPLETION_FILE_LIMIT = CHAT_COMPLETION_FILE_LIMIT_MB * 1024 * 1024

export const chatCompletionFileType = (name: string) => FILE_TYPES.get(getFileExt(name))

export const validateChatCompletionFiles = (
  files: readonly Pick<File, 'name' | 'size'>[]
): TranslationMessage | null => {
  if (files.some((file) => !chatCompletionFileType(file.name))) {
    return { key: 'chatCompletionsFileTypes' }
  }
  if (files.length > MAX_COUNT) {
    return { key: 'uploadMaxFiles', params: { count: MAX_COUNT } }
  }
  if (files.reduce((total, file) => total + file.size, 0) > CHAT_COMPLETION_FILE_LIMIT) {
    return { key: 'chatCompletionsFileSize', params: { size: CHAT_COMPLETION_FILE_LIMIT_MB } }
  }
  return null
}

const readDataUrl = (blob: Blob, mimeType: string, signal: AbortSignal) =>
  new Promise<string>((resolve, reject) => {
    throwIfAborted(signal)
    const reader = new FileReader()
    const abort = () => reader.abort()
    reader.onloadend = () => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) {
        reject(getAbortReason(signal))
      } else if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(reader.error)
      }
    }
    reader.readAsDataURL(blob.slice(0, blob.size, mimeType))
    signal.addEventListener('abort', abort, { once: true })
  })

export const toChatCompletionFilePart = async (
  name: string,
  mimeType: string,
  blob: Blob,
  signal: AbortSignal
): Promise<ChatCompletionPart> => {
  throwIfAborted(signal)
  try {
    if (mimeType === 'text/plain') {
      const content = await blob.text()
      throwIfAborted(signal)
      return { type: 'text', text: `Attached file: ${JSON.stringify(name)}\n${content}` }
    }
    const url = await readDataUrl(blob, mimeType, signal)
    return mimeType === 'application/pdf'
      ? { type: 'file', file: { filename: name, file_data: url } }
      : { type: 'image_url', image_url: { url } }
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    throw new ApiError('protocol', { key: 'chatCompletionsFileRead', params: { name } })
  }
}
