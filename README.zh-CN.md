# chat-demo

[English](README.md) | 简体中文

基于 DeepSeek API 的静态聊天示例。无需应用后端，浏览器直接请求配置的 API 服务。

点击 [在线体验](https://deepseek-ai.github.io/chat-demo/) 即可使用，也可以前往 [Releases](https://github.com/deepseek-ai/deepseek-chat-demo/releases) 下载压缩包，解压后双击 `index.html` 在本地使用，无需安装或构建。首次使用时，请在设置中填写 API Key。

## 运行

准备 Node.js 22.12+ 和 pnpm：

```sh
git clone https://github.com/deepseek-ai/chat-demo.git
cd chat-demo
pnpm install
pnpm dev
```

打开 http://localhost:8090 。

生成静态产物：

```sh
pnpm build
```

产物位于 `dist/`，可部署到静态服务器，也可直接打开 `dist/index.html`。直接打开时，浏览器和 API 服务需允许 `file://` 页面的存储与跨域请求。

## Chat Completions

在**设置 → 数据管理**中填写兼容接口的完整地址（例如同源路径 `/v1/chat/completions`）。点击**加载模型**，从列表中选择一个模型，再点击**应用**。模型列表来自对应的 `/models` 接口，例如 `/v1/models`。清空 Chat Completions 地址并应用即可切回 DeepSeek。

如果接口需要 Bearer 认证，请在加载模型前填写对应的 **Chat Completions API Key**。点击**应用**后，浏览器会将密钥与配置的接口一起保存，并在加载模型及发送对话时使用。跨域接口需要允许来自应用源且携带 `Authorization` 请求头的请求。

可以通过附件按钮、粘贴或拖拽添加 JPEG、PNG、GIF、WebP、PDF、Markdown、纯文本或 HTML。图片和 PDF 内联发送，要求接口和模型支持对应的 Chat Completions 内容类型。Markdown、纯文本和 HTML 按 UTF-8 读取并作为文本发送。原件保存在本地，每次请求在 32 MB 附件额度内携带可用的近期附件。

开启深度思考时发送 `reasoning_effort: "max"`，关闭时发送 `reasoning_effort: "medium"`。所配置的接口和模型需支持对应的值。

如果接口流式返回推理文本，应用会将其显示在回答上方的可折叠思考区域，支持 `delta.reasoning_content`、`delta.reasoning` 和 `delta.reasoning_details` 中的文本条目。

使用网页搜索时，请在**设置 → 数据管理**中保存自己的 **Exa API Key**，并选择支持函数调用的 Chat Completions 模型。打开**搜索**后，模型可按需调用网页搜索。应用将模型生成的搜索词发给 Exa，把结果返回给模型，并在回复中展示来源。

部署到 Cloudflare Workers 时，浏览器通过站点的 `/api/exa/search` 接口将密钥和搜索词转发给 Exa。Worker 仅在当次请求中使用密钥，不会保存。Workers Builds 会自动设置 `WORKERS_CI=1`，构建和部署命令仍为 `pnpm run build` 和 `npx wrangler deploy`。手动构建 Workers 版本时也需设置 `WORKERS_CI=1`。普通静态构建会直接请求 Exa，需要 Exa 的响应允许跨域访问。

## 功能

- 多会话、自动标题、重命名与删除；编辑提问、重新生成和切换消息分支。
- 流式回答、深度思考、智能搜索、链接阅读与来源引用；支持停止和符合条件的继续生成。
- 附件上传、粘贴与拖拽，语音输入和回复朗读；移动端录音时输入框首行显示实时频谱。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。
- 简体中文与英文、浅色与深色主题、移动端布局、位置设置、历史导入导出。

## 数据

API Key 和设置保存在浏览器 localStorage，会话及附件原件保存在 IndexedDB，本地数据按浏览器用户配置和站点源（origin）隔离。发送对话、上传附件和使用语音功能时，相应内容会提交给配置的 API 服务。

设置中的历史导入导出使用 ZIP 格式。导入会在确认并校验成功后替换全部本地会话和附件；导出包含会话与本地可用的图片原件，不包含 API Key、设置或非图片附件原件。格式与保留范围见[历史导入导出](src/services/chat/history/README.md)。

设置 → 数据管理 → 删除所有对话，会在确认后清空全部本地会话、附件原件和未发送的草稿，停止正在生成的回复并回到新对话。API Key 和其他设置保留，已上传到 API 服务的文件不受影响。

## 开发

| 命令          | 用途                |
| ------------- | ------------------- |
| `pnpm dev`    | 启动开发服务器      |
| `pnpm build`  | 构建到 `dist/`      |
| `pnpm type`   | TypeScript 类型检查 |
| `pnpm lint`   | oxlint 检查         |
| `pnpm format` | oxfmt 格式化        |

[rspack.config.ts](rspack.config.ts) 默认连接 `https://api.deepseek.com`。`createConfig({ apiOrigin, devServer })` 支持自定义 API 地址和开发服务器代理。

聊天默认使用 `deepseek-flash`，通过 Anthropic 兼容的 Messages / Files API 通信；语音使用 ASR / TTS 接口。请求使用搜索、链接阅读、标题和 `latest_reminder` 等扩展，接入服务需支持相应能力。附件实际支持的格式以服务端校验为准。

```text
src/
  app/                 应用布局、主题与全局样式
  components/          聊天、设置、Markdown 等界面组件
  i18n/                中英文文案
  services/
    api/               API 请求、SSE 与协议类型
    chat/              会话、消息分支、本地存储与历史导入导出
    markdown/          Markdown 解析、代码高亮与图表
    speech/            录音与朗读
  utils/               通用工具
```

## 许可证

[MIT](LICENSE)。构建会将许可证复制到 `dist/LICENSE`，分发时请一并保留；第三方依赖遵循各自的许可证。
