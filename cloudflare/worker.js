const SEARCH_PATH = '/api/exa/search'
const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

const errorResponse = (status, error, headers) =>
  Response.json({ error }, { status, headers: { ...RESPONSE_HEADERS, ...headers } })

// eslint-disable-next-line import/no-default-export
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== SEARCH_PATH) {
      return env.ASSETS.fetch(request)
    }
    if (request.method !== 'POST') {
      return errorResponse(405, 'Use POST to search.', { Allow: 'POST' })
    }
    if (request.headers.get('Origin') !== url.origin) {
      return errorResponse(403, 'Search requires a same-origin request.')
    }
    const apiKey = request.headers.get('x-api-key')?.trim()
    if (!apiKey) {
      return errorResponse(401, 'An Exa API key is required.')
    }
    const mediaType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
    if (mediaType !== 'application/json' || !request.body) {
      return errorResponse(415, 'Search requires a JSON request body.')
    }

    try {
      const upstream = await fetch(EXA_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: request.body,
        redirect: 'manual',
        signal: request.signal,
      })
      if (upstream.status >= 300 && upstream.status < 400) {
        return errorResponse(502, 'Exa returned an unexpected redirect.')
      }
      return new Response(upstream.body, { status: upstream.status, headers: RESPONSE_HEADERS })
    } catch {
      return errorResponse(502, 'Could not reach Exa.')
    }
  },
}
