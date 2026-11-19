import { lazy, Suspense, type ComponentProps } from 'react'

const loadMarkdown = () => import('./MarkdownContent.js')

export const preloadMarkdown = () => {
  // 预加载失败时，首次渲染仍可重新请求。
  void loadMarkdown().catch(() => {})
}

const MarkdownContent = lazy(() =>
  loadMarkdown().then(({ MarkdownContent }) => ({ default: MarkdownContent }))
)

/** 首次显示回复时再加载 Markdown 解析器和渲染器。 */
export const Markdown = (props: ComponentProps<typeof MarkdownContent>) => (
  <Suspense fallback={null}>
    <MarkdownContent {...props} />
  </Suspense>
)
