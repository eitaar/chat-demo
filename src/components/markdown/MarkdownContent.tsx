import { memo, useMemo } from 'react'
import type { Source } from '../../services/chat/view.js'
import { createStreamingParser, toMdAst } from '../../services/markdown/parse.js'
import { useScrollToBottom } from '../messages/scrollContext.js'
import { MarkdownAstRenderer } from './MarkdownAstRenderer.js'
import { useThrottleMarkdownRender } from './useThrottleMarkdownRender.js'
import './markdown.css'
import './highlight.css'

/**
 * 渲染链路：节流 → 解析 AST → 渲染。
 * 传入 sources 时把正文里的 [citation:N] 渲染为角标。
 */
export const MarkdownContent = memo(function MarkdownContent({
  content,
  loading,
  cacheKey,
  className,
  disableLink,
  sources,
}: {
  content: string
  loading: boolean
  cacheKey: string
  className?: string
  disableLink: boolean
  sources?: Source[]
}) {
  const scrollToBottom = useScrollToBottom()
  const throttledMarkdown = useThrottleMarkdownRender(content, loading)
  const parse = useMemo(() => {
    const options = { sources, disableLink }
    return loading
      ? createStreamingParser(options)
      : (input: string) => toMdAst(input, options).children
  }, [sources, disableLink, loading])
  const nodes = useMemo(
    () => (throttledMarkdown ? parse(throttledMarkdown) : null),
    [throttledMarkdown, parse]
  )
  return nodes ? (
    <MarkdownAstRenderer
      key={cacheKey}
      className={className}
      nodes={nodes}
      loading={loading}
      onUpdate={scrollToBottom}
    />
  ) : null
})
