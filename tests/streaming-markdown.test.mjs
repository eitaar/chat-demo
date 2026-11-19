import assert from 'node:assert/strict'
import test from 'node:test'
import { createStreamingParser, toMdAst } from '../src/services/markdown/parse.ts'

const options = {
  disableLink: false,
  sources: [{ index: 1, url: 'https://example.com', title: 'Example' }],
}

// The renderer uses node content. Offsets are local to the parser input.
const withoutPositions = (nodes) =>
  JSON.parse(JSON.stringify(nodes, (key, value) => (key === 'position' ? undefined : value)))

test('streamed fragments match a full parse as Markdown constructs open and close', () => {
  const samples = [
    '# Heading\r\n\r\nFirst *paragraph*.\r\n \t\r\nSecond **paragraph**.',
    'First.\n\nA [forward][id] link and [citation:1].\n\n[id]: https://example.com',
    '[id]: /path\n\nFirst.\n\nA [forward][id] link.',
    'First.\n\nSetext\n---\n\n- item\n\n  continuation\n- another',
    'First.\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n> Quoted.',
    'First.\n\n```js\ncode\n\nmore\n```\n\n$$\nx^2\n\n+y\n$$',
    'First.\n\n<!-- comment\n\nstill hidden -->\n\nA footnote[^1].\n\n[^1]: text',
  ]
  for (const input of samples) {
    const parse = createStreamingParser(options)
    for (let end = 1; end <= input.length; end++) {
      const fragment = input.slice(0, end)
      assert.deepEqual(
        withoutPositions(parse(fragment)),
        withoutPositions(toMdAst(fragment, options).children)
      )
    }
  }
})

test('completed paragraphs retain their identity until an edit changes the boundary', () => {
  const parse = createStreamingParser(options)
  const [first] = parse('Alpha.\n\nBeta')
  assert.equal(parse('Alpha.\n\nBeta!')[0], first)
  for (const edit of ['Alpha.\n---', 'A replacement.', '', 'A new\n\nreply']) {
    assert.deepEqual(
      withoutPositions(parse(edit)),
      withoutPositions(toMdAst(edit, options).children)
    )
  }
})
