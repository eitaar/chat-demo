import { create } from 'zustand'
import type { TtsVoice } from './api/speech.js'
import { normalizeLocation, type UserLocation } from './location.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

export type ChatCompletionsSettings = {
  endpoint: string
  model: string
  apiKey?: string
  fastModel?: string
}

/** 本机设置，存 localStorage：API Key、语言、主题、位置、朗读音色、深度思考与智能搜索开关、侧边栏收起状态 */
type Settings = {
  apiKey: string | null
  exaApiKey: string | null
  exaSearch: boolean
  chatCompletions: ChatCompletionsSettings | null
  fastMode: boolean
  locale: Locale
  themePreference: ThemePreference
  location: UserLocation | null
  ttsVoice: TtsVoice
  thinking: boolean
  search: boolean
  siderCollapsed: boolean
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  exaApiKey: 'chat-demo:exa-api-key',
  exaSearch: 'chat-demo:exa-search',
  chatCompletions: 'chat-demo:chat-completions',
  fastMode: 'chat-demo:fast-mode',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  ttsVoice: 'chat-demo:tts-voice',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

export const parseChatCompletionsEndpoint = (value: string): string | null => {
  const endpoint = value.trim()
  if (!/^(\/[^/]|https?:\/\/)/i.test(endpoint) || /[\t\r\n\\]/.test(endpoint)) {
    return null
  }
  try {
    const url = new URL(endpoint, 'https://localhost')
    return url.username || url.password || url.hash ? null : endpoint
  } catch {
    return null
  }
}

export const parseChatCompletionsSettings = (
  endpoint: string,
  model: string,
  apiKey?: string,
  fastModel?: string
): ChatCompletionsSettings | null => {
  const parsedEndpoint = parseChatCompletionsEndpoint(endpoint)
  const modelId = model.trim()
  const key = apiKey?.trim()
  const fastModelId = fastModel?.trim()
  return parsedEndpoint && modelId
    ? {
        endpoint: parsedEndpoint,
        model: modelId,
        ...(key ? { apiKey: key } : {}),
        ...(fastModelId ? { fastModel: fastModelId } : {}),
      }
    : null
}

const initialChatCompletions = (): ChatCompletionsSettings | null => {
  try {
    const saved = JSON.parse(read(KEYS.chatCompletions) ?? 'null')
    return typeof saved?.endpoint === 'string' && typeof saved.model === 'string'
      ? parseChatCompletionsSettings(
          saved.endpoint,
          saved.model,
          typeof saved.apiKey === 'string' ? saved.apiKey : undefined,
          typeof saved.fastModel === 'string' ? saved.fastModel : undefined
        )
      : null
  } catch {
    return null
  }
}

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  exaApiKey: read(KEYS.exaApiKey),
  exaSearch: read(KEYS.exaSearch) === 'true',
  chatCompletions: initialChatCompletions(),
  fastMode: read(KEYS.fastMode) === 'true',
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  ttsVoice: initialTtsVoice(),
  thinking: read(KEYS.thinking) === 'true',
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setExaApiKey = (exaApiKey: string | null) => {
  write(KEYS.exaApiKey, exaApiKey)
  if (exaApiKey === null) {
    write(KEYS.exaSearch, null)
    useSettings.setState({ exaApiKey, exaSearch: false })
  } else {
    useSettings.setState({ exaApiKey })
  }
}

export const setExaSearch = (exaSearch: boolean) => {
  write(KEYS.exaSearch, String(exaSearch))
  useSettings.setState({ exaSearch })
}

export const setChatCompletions = (chatCompletions: ChatCompletionsSettings | null) => {
  write(KEYS.chatCompletions, chatCompletions ? JSON.stringify(chatCompletions) : null)
  if (
    !chatCompletions?.fastModel ||
    chatCompletions.endpoint !== useSettings.getState().chatCompletions?.endpoint
  ) {
    write(KEYS.fastMode, null)
    useSettings.setState({ chatCompletions, fastMode: false })
    return
  }
  useSettings.setState({ chatCompletions })
}

export const setFastMode = (fastMode: boolean) => {
  write(KEYS.fastMode, String(fastMode))
  useSettings.setState({ fastMode })
}

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
