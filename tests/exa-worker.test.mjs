import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../cloudflare/worker.js'

const origin = 'https://chat.example.com'
const searchUrl = `${origin}/api/exa/search`
const headers = {
  Origin: origin,
  'Content-Type': 'application/json',
  'x-api-key': 'test-key',
}

test('relays Exa responses and HTTP status without requiring an upstream CORS header', async (t) => {
  const body = JSON.stringify({ query: 'search terms', numResults: 5 })
  const payload = { results: [{ url: 'https://example.com' }] }
  const upstream = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://api.exa.ai/search')
    assert.equal(init.method, 'POST')
    assert.equal(init.redirect, 'manual')
    assert.deepEqual(init.headers, {
      'Content-Type': 'application/json',
      'x-api-key': 'test-key',
    })
    assert.equal(await new Response(init.body).text(), body)
    return Response.json(payload, {
      status: 200,
      headers: { 'Set-Cookie': 'upstream=value', 'Cache-Control': 'public' },
    })
  })

  const reply = await worker.fetch(new Request(searchUrl, { method: 'POST', headers, body }))
  assert.equal(upstream.mock.callCount(), 1)
  assert.equal(reply.status, 200)
  assert.equal(reply.headers.get('Set-Cookie'), null)
  assert.equal(reply.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await reply.json(), payload)
})

test('preserves Exa authentication errors for the app', async (t) => {
  const error = { error: 'Invalid API key' }
  t.mock.method(globalThis, 'fetch', async () => Response.json(error, { status: 401 }))
  const reply = await worker.fetch(new Request(searchUrl, { method: 'POST', headers, body: '{}' }))
  assert.equal(reply.status, 401)
  assert.deepEqual(await reply.json(), error)
})

test('rejects upstream redirects without forwarding the redirect to the browser', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.redirect('https://other.example'))
  const reply = await worker.fetch(new Request(searchUrl, { method: 'POST', headers, body: '{}' }))
  assert.equal(reply.status, 502)
  assert.equal(reply.headers.get('Location'), null)
})

test('requires a same-origin POST with a caller-provided key and delegates asset requests', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch')
  const foreign = await worker.fetch(
    new Request(searchUrl, {
      method: 'POST',
      headers: { ...headers, Origin: 'https://other.example' },
      body: '{}',
    })
  )
  assert.equal(foreign.status, 403)
  const missingKey = await worker.fetch(
    new Request(searchUrl, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: '{}',
    })
  )
  assert.equal(missingKey.status, 401)
  assert.equal((await worker.fetch(new Request(searchUrl))).status, 405)

  const assetRequest = new Request(origin)
  const assets = t.mock.fn(async () => new Response('site'))
  const site = await worker.fetch(assetRequest, { ASSETS: { fetch: assets } })
  assert.equal(await site.text(), 'site')
  assert.deepEqual(assets.mock.calls[0].arguments, [assetRequest])
  assert.equal(upstream.mock.callCount(), 0)
})
