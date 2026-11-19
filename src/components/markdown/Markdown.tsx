import { lazy, Suspense, type ComponentProps } from 'react'

const MarkdownContent = lazy(() =>
  import('./MarkdownContent.js').then(({ MarkdownContent }) => ({ default: MarkdownContent }))
)

/** 首次显示回复时再加载 Markdown 解析器和渲染器。 */
export const Markdown = (props: ComponentProps<typeof MarkdownContent>) => (
  <Suspense fallback={null}>
    <MarkdownContent {...props} />
  </Suspense>
)
