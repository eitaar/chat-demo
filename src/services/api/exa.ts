import { isWebUrl } from '../../utils/url.js'
import { ApiError, request } from './client.js'

const RESULT_LIMIT = 5
const EXCERPT_LIMIT = 600

export type SearchSource = { url: string; title: string; excerpt: string }

export const searchExa = async (
  apiKey: string,
  query: string,
  signal: AbortSignal
): Promise<SearchSource[]> => {
  try {
    const response = await request(__EXA_SEARCH_URL__, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        query,
        numResults: RESULT_LIMIT,
        contents: { highlights: { maxCharacters: EXCERPT_LIMIT } },
      }),
      redirect: 'error',
      signal,
    })
    const data = (await response.json()) as {
      results?: { url?: unknown; title?: unknown; highlights?: unknown }[]
    } | null
    if (!Array.isArray(data?.results)) {
      throw new ApiError('protocol', '')
    }

    const sources: SearchSource[] = []
    const urls = new Set<string>()
    for (const result of data.results) {
      if (typeof result?.url !== 'string' || !isWebUrl(result.url) || urls.has(result.url)) {
        continue
      }
      urls.add(result.url)
      const excerpt = Array.isArray(result.highlights)
        ? result.highlights
            .filter((highlight) => typeof highlight === 'string')
            .join('\n')
            .trim()
            .slice(0, EXCERPT_LIMIT)
        : ''
      sources.push({
        url: result.url,
        title: (typeof result.title === 'string' && result.title.trim()) || result.url,
        excerpt,
      })
      if (sources.length === RESULT_LIMIT) {
        break
      }
    }
    return sources
  } catch (error) {
    if (signal.aborted) {
      throw error
    }
    const status = error instanceof ApiError ? error.status : undefined
    throw new ApiError('protocol', {
      key: status === 401 || status === 403 ? 'exaKeyRejected' : 'exaSearchFailed',
    })
  }
}
