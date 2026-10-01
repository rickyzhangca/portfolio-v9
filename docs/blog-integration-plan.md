# Blog 整合进 Portfolio：研究与实施方案

实施已完成。当前架构、写作流程和验证结果见 [writing.md](./writing.md)。下文保留实施前的研究基线与决策依据。

研究日期：2026-09-30。Portfolio 基线：`e54e3e3224b008559ef26280e16cfb7cabadb683`。Blog 基线：`e6b19d844d9eb73e3caa0d6e15116489630061cd`；本地副本 HEAD 与 GitHub main 一致，工作区干净。

## 推荐决策

保留 Vite、React 和现有 canvas，把 blog 的文章源文件迁进 portfolio。新增 Writing 文件夹，复用项目文件夹的展开布局；内部使用独立的 ArticleCard，呈现类似 ResumeCard 的纸张预览。点击文章进入有独立 URL 的阅读界面。

采用构建时编译的 MDX，轻量文章目录与正文模块分开。路由建议采用 React Router Framework Mode，使用静态预渲染输出文章 HTML，首页 canvas 通过客户端边界加载。增加的是路由和内容能力，现有 canvas 布局、拖动、Jotai 配置和 reducer 可以继续使用。

代价是调整应用入口、构建配置和部署产物目录。收益是有官方支持的路由、预渲染和错误边界，避免自行维护 HTML 生成器和浏览器历史逻辑。该选择仍需在实施第一步验证 MDX、Router、React Compiler 和现有动画一起工作的情况。

## 已确认的现状

### Blog 内容

| Slug | 英文标题 | 中文标题 | 发布日期 |
| --- | --- | --- | --- |
| design-system-team-maturity | Design System Team Maturity | 设计系统团队成熟度 | 2026-02-23 |
| ephemeral-design | Ephemeral Design | 瞬时设计 | 2026-02-20 |
| verification-asymmetry | Verification asymmetry | 验证的不对称性 | 2025-07-01 |

共 3 篇文章、6 个 MDX 正文文件，正文原文件共 73,285 bytes。Verification asymmetry 另有 10 张 SVG 图和 3 张头像，共 613,285 bytes；两种语言复用这些资源。

Blog 是 Next.js 应用。元信息在 `app/<slug>/meta.json`，正文在 `content/articles/<slug>/<locale>.mdx`，封面是 React SVG 组件。Verification asymmetry 使用显式 Image/Avatar imports 和 `credit` export；另外两篇主要是 Markdown，其中 Design System Team Maturity 使用 GFM 表格。

已有双语路由、语言切换、文章 metadata、sitemap 和动态 OG 图片。合并时应保留这些产品能力。Next.js 的路由、`next/image`、OG API 和 Three.js 背景不需要随内容一起迁移。

源码依据：[blog 仓库](https://github.com/rickyzhangca/blog/tree/e6b19d844d9eb73e3caa0d6e15116489630061cd)。

### Portfolio 扩展点与限制

| 位置 | 当前行为 | 整合需要 |
| --- | --- | --- |
| `src/cards/registry.ts` | 类型、interaction policy 集中声明 | 新增 article 和 folder-cover 两种 card |
| `src/types/canvas.ts` | stack 子卡片只允许 project/stickynote，cover 只允许公司 cover | 扩展允许的具体联合类型 |
| `src/components/groups/card-group.tsx` | 已有文件夹扇形布局；收起时所有子卡片仍挂载 | 复用布局，补充子卡片激活，限制挂载数量 |
| `src/components/canvas/canvas.tsx:539` | 激活处理只接受 single；resume/about 各有独立状态 | 支持 itemId + cardId；统一文档打开状态 |
| `src/cards/resume/resume-card.tsx` | 缩小渲染完整 ResumeSheet | 复用纸张外观，文章只渲染有限预览 |
| `src/cards/render-card.tsx` | 有两份相同 ResizeObserver effect；组件采用静态 imports | 删除重复 observer，保证重型阅读组件不从这里导入 |
| `src/lib/card-layout.ts`、`src/lib/auto-pan.ts` | 共用 offsets，但旋转、弧线、bounds 仍有重复计算 | 让绘制和 auto-pan 使用同一份布局结果 |
| `src/index.css`、`index.html` | 全局禁止滚动、touch-action 和用户缩放 | 把 canvas 手势约束收回 canvas 容器，阅读区正常滚动和缩放 |
| `vite.config.ts` | vendor 匹配 `/react\|react-dom\|jotai/`，范围过宽 | 根据实际模块图重做共享包边界 |

现有 MarkdownRenderer 可以继续服务 About/Fun Projects；它没有配置 GFM，也不能执行 MDX 的 imports、JSX 和 exports。文章需要自己的内容渲染入口。

## 用户体验

1. 首页出现 Writing 文件夹，形状和展开方式与 project 文件夹一致。
2. 每篇文章对应一张 ArticleCard；中英文是同一篇文章的两个版本，不生成重复卡片。
3. 卡片使用白色纸张、标题、日期、简介和有限的正文开头预览。保留原 SVG 封面作为可选视觉元素，卡片中采用静态呈现。
4. 文件夹按发布日期倒序排列；同日使用 slug 作为稳定的次排序键。
5. 点击卡片进入全屏阅读层，同时更新 URL。关闭后保留文件夹展开状态、卡片位置和 canvas viewport。
6. 直接访问文章 URL 时显示完整文章页面，不要求先打开首页或下载 canvas。
7. 阅读区支持语言切换、文本选择、正常页面/容器滚动、图片、表格和章节链接。

建议 URL：`/writing/en/<slug>` 与 `/writing/cn/<slug>`，保留现有 locale 标识，HTML lang/hreflang 使用 `en` 与 `zh-CN`。`/writing` 提供可分享的文章目录。

## 内容组织与构建

```text
src/content/articles/
  verification-asymmetry/
    meta.json
    en.mdx
    cn.mdx
    assets/
      0.svg ... 9.svg
      jerry-wang.webp
      ryan-yao.webp
      anthony-ung.webp
  ephemeral-design/
    meta.json
    en.mdx
    cn.mdx
  design-system-team-maturity/
    meta.json
    en.mdx
    cn.mdx

src/types/article.ts
src/lib/articles/                 # 纯查询、locale、path 等函数
src/cards/article/article-card.tsx
src/cards/folder-cover/folder-cover-card.tsx
src/components/articles/          # Reader、Sheet、Image、Credits、排版组件
src/components/documents/         # 共享文档阅读外壳
src/scenes/data/writing.ts
```

元信息与正文放在同一目录。先沿用 blog 的 title/description/published JSON 形状，slug 由目录名生成。新增文章只需要添加目录和内容，不需要编辑注册表、路由表或手写 MDX manifest。

构建前扫描内容，产生两类独立产物：

- 可序列化的 metadata catalogue：标题、简介、日期、可用语言、有限预览；不包含正文组件和 loader。
- 仅包含发布文章的 loader manifest：每个 slug/locale 指向一个静态可分析的动态 import。

内容扫描代码属于 Node 构建工具，不进入 `src/lib` 的浏览器纯函数模块。开发模式监听内容增删与 meta 修改，重新生成索引并触发 HMR。生成文件不手工维护，CI 从源文件重建，并检查路径和结果确定性。

扫描器校验 JSON 形状、slug、真实日期、标题/简介、正文与语言的一致性、重复身份和本地资源引用。错误指出文件和字段，并使构建失败，避免沿用原 blog 静默跳过无效文章的行为。未来若支持 draft，必须在生成客户端 imports、预渲染、目录和 sitemap 前排除草稿，不能只在 UI 过滤。

MDX 使用 `@mdx-js/rollup` 在构建时编译，配置 `remark-gfm`。把排版组件通过 MDX 的 `components` 参数传入，按需使用命名导出的 credit；不需要在浏览器加载 MDX 编译器，也不必为了这一用途引入 MDXProvider。MDX/Vite 的官方集成支持此编译方式。[MDX 文档](https://mdxjs.com/docs/getting-started/#vite)

Vite 的 glob imports 默认支持动态加载。直接做小规模实现时，metadata 可以 eager，正文必须 lazy；长期实现由同一个扫描器生成经过验证的 manifest，解决 metadata、正文、预渲染路径不一致的问题。[Vite 文档](https://vite.dev/guide/features.html#glob-import)

资源建议与文章同目录，通过静态 imports 交给 Vite，得到有内容 hash 的文件名。迁移时改写原有 `/verification-asymmetry/...` 路径。Image 改为共享 ArticleImage，保留 width/height、alt、lazy loading 和 async decoding；credit 的重复头像 UI 改为共享 ArticleCredits。

## Card 与文档交互的重构边界

ArticleCard 是独立 card kind，内容只保存稳定的 slug。文章领域类型放在 `src/types/article.ts`，不把正文内容、router 对象或异步加载状态放进 CanvasState。

`StackCardInstance` 扩展为 project、stickynote、article 的明确联合。新增 `FolderCoverCardInstance`，cover 类型允许原公司 cover 或新 folder-cover。继续使用 `kind: "stack"`，不增加需要在 canvas/reducer/auto-pan 各处复制分支的 blogstack。

FolderCoverCard 表达 label/count 等文件夹信息，避免把 Writing 塞进 company 字段。公司封面数据无需批量改名。

激活目标统一为 `{ itemId, cardId }`，single 和 stack 都先解析真实 card，再读取 interaction policy。RenderCard 继续负责展示；拖动、点击阈值、键盘和打开行为由交互 wrapper 处理。展开的 ArticleCard 使用真实链接，支持新标签页和修饰键操作，拖动超过阈值取消导航；收起的预览退出 tab 顺序，设置 inert/aria-hidden。

统一文档选择为可辨识联合：resume、about、article 各有必要的身份数据。共享 ReaderShell 管理 Portal、遮罩、Escape、焦点限制、关闭和焦点归还；ResumeSheet、AboutSheet、ArticleSheet 保留各自内容渲染。可基于已安装的 Base UI Dialog 实现交互阅读层。[Base UI Dialog](https://base-ui.com/react/components/dialog)

共享 PaperPreviewFrame 只提取纸张外观和尺寸计算。ArticleCard 不复用完整 ArticleSheet；预览高度固定，正文长度、图片解码和语言切换都不应改变 canvas 卡片的布局。

## 路由、预渲染与阅读层

建议引入 React Router 的 Framework Mode，采用 `ssr: false` 和明确的 prerender 路径集合。路径由已验证的 catalogue 生成，目前包括文章目录和 6 个文章 URL；`prerender: true` 本身不会枚举动态 slug。[React Router 预渲染文档](https://reactrouter.com/how-to/pre-rendering)

2026-09-30 读取的 `@react-router/dev@8.4.0` 声明支持 Vite 7/8 和 TypeScript 5/6/7，Node 要求 >=22.22.0；本地检查运行在 Node 24.21.0。锁定兼容版本并在 CI 固定 Node；完整插件组合的兼容性以第一阶段构建验证为准。[包元信息](https://registry.npmjs.org/@react-router/dev/8.4.0)

首页 Canvas 放到客户端专用入口。SSR 安全的根 shell 不静态导入 canvas scene、大量项目资源或访问 window 的代码，首次 HTML 与 hydration 的占位内容一致。直接访问文章时不会挂载 CanvasHost。[React Router 客户端模块](https://reactrouter.com/api/framework-conventions/client-modules)

从首页打开文章时，由根 shell 保持已存在的 canvas session，并展示阅读层；后台 canvas 禁止交互。URL 是文章 slug/locale 的唯一来源。导航 state 只携带“从哪张卡片打开”与返回来源，丢失或刷新后自然退化为独立文章页面。共享 ArticleSheet 用于阅读层和预渲染页面，避免两套正文实现。

关闭规则：确认有站内来源时返回该来源；直接访问时回到 `/writing` 或首页，不能无条件 history.back()。语言切换使用 replace，避免每切一次语言都增加一次关闭所需的返回操作。Back/Forward 必须与点击关闭保持一致。

每个静态文章 HTML 包含正文、语言、标题、description、canonical、hreflang、OG/Twitter metadata。仅客户端修改 head 无法保证不执行 JS 的分享抓取器取得这些信息；预渲染也降低了搜索抓取对 JS 渲染的依赖。[Google 的 JavaScript SEO 文档](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

文章标题只生成一个 h1。章节 ID 在构建时用支持 Unicode 的算法生成，重复标题去重；不要沿用 blog 中只保留 a-z/0-9 的 slugify，它会丢失中文标题。目录和正文使用同一份章节 ID。

## 性能与文章数量增长

当前构建的 HTML 引用 5 个首页 JS 文件，重新 gzip 的合计为 330,967 bytes，约 331 kB；不包含 CSS、图片、视频、分析脚本和后续动态请求。这只是构建传输量基线，没有测量运行时帧率。

vendor 文件本身为 678,656 bytes，gzip 214,356 bytes。检查产物确认它包含 reactShiki 和高亮相关代码，且它被首页 modulepreload 引用。构建还报告 MarkdownRenderer 被同时静态/动态导入，使该懒加载无法形成独立 chunk。新增 React.lazy 之前必须先修正这些边界。

性能验收使用实际生产模块图和浏览器请求，而非只检查源码有没有 lazy：

- 首页只需要文章目录与卡片预览，不请求任何文章正文或文章图片。
- 只加载当前 slug/locale 的正文；阅读高亮、封面动画和其他可选内容独立加载。
- 新的 router 构建默认分包与现有自定义 vendor 规则一起评估；避免用宽泛的 react 字符串把 reader 依赖合回首包。
- 文件夹收起时只挂载前 2 张预览；展开后每页最多 6 张。当前 3 篇全部展示，超过 6 篇后在文件夹内分页，目录页可访问全部文章。
- 收起动画完成再卸载退出的卡片，维持动画连续性；不可见卡片不保留大量 observer/DOM。
- folder 的 page state 与内容数据分开，纯 StackLayout 输出该页的卡片 transforms 和 bounds。CardStack、auto-pan 使用同一份结果，避免按全部文章计算巨大视野范围。
- 使用固定 ArticleCard 尺寸，布局与正文无关。分页时只计算当前页；不要为文章全文建立 canvas measurement。
- 图片保留尺寸避免布局跳动；卡片封面静态展示，阅读界面可以按 reduced-motion 设置播放有限动画。
- 采用 3、100、1000 篇 metadata fixtures 测量 DOM、计算时间和交互，先证明有限渲染是否足够，再考虑更复杂的虚拟化。

不设未经测量的“必然 60fps”或首包降低百分比。明确要求：首页零正文请求、挂载卡片数有上界、直接文章页零 canvas 依赖、原 project/resume 行为通过回归检查。

## 上线与原链接迁移

生成静态 sitemap 和每种语言的分享 PNG/JPEG，替代 blog 的 Next.js OG API；同一个内容 catalogue 驱动卡片、目录、路由、sitemap 和分享信息。

文章 URL 的静态文件优先被部署平台直接服务。fallback 只服务需要 SPA 的路径；未知 slug、无效 locale 和不存在的文章静态路由应返回真正的 404，不能 blanket rewrite 所有路径到首页并返回 200。检查 build 输出目录和 Vercel 项目设置，现有 `vercel.json` 只有缓存 headers，不包含这些路由规则。

hash assets 长期 immutable 缓存；HTML 与无 hash 的 metadata 使用重新验证策略。上线切换时保留旧部署文件的合理可用期，避免已有页面下载旧 chunk 时失败；正文加载失败提供重试/重新加载入口，不显示空白阅读页。

确认实际使用的旧域名后，在旧站做永久重定向：`/en/<slug>`、`/cn/<slug>` 以及旧的无 locale slug 路径映射到新文章路径，并保留 query。URI fragment 的浏览器行为需要实际验证。旧根目录和 locale 目录映射到新目录页。仓库代码使用 `blog.rickyzhang.me`，GitHub homepage 是 `blog-silk-nu.vercel.app`，不能只依据其中一个判断所有已有链接。

内容迁移完成后 portfolio 成为写作的单一来源；原 blog 仓库保留历史与迁移说明。实施阶段不需要 git subtree/submodule、monorepo 或运行时 GitHub API。部署重定向和旧站退役属于正式上线阶段。

## 推荐实施顺序与验收

### 第一步：验证内容和路由底座

迁入全部文章、资源和元信息；接入 MDX/GFM、内容校验与自动 manifest。验证一篇带 JSX/credit 的文章和一篇带 GFM 表格的文章在 Vite 8、React Compiler、Router 组合下能构建和渲染。建立静态文章路由与客户端 canvas 边界。工具和 scripts 变化同步更新 AGENTS.md。

验收：6 个 URL 均生成正文 HTML；没有 window/document SSR 错误和 hydration 差异；错误内容使构建失败；直接访问文章不引用 canvas/项目资源；动态路径由 catalogue 自动枚举。

### 第二步：接入 Writing 文件夹

扩展 card/stack 的具体类型，新增 FolderCoverCard 和 ArticleCard，接入 home-scene。统一子卡片激活身份、文档打开状态和 ReaderShell，补齐真实链接、拖动阈值、键盘与焦点归还。删除 RenderCard 重复 observer。固定预览尺寸，整理共同布局计算并接入有限挂载和分页。

验收：三个文章都可从文件夹打开；拖动不误打开；关闭恢复 canvas；双语不会产生重复卡片；Back/Forward、Escape、触屏、键盘可操作；原 project 展开、auto-pan、resume/about/macbook 回归通过。

### 第三步：生产质量与发布迁移

修正共享 chunk 边界，检查首页和文章页请求图；完善长文排版、GFM 表格横向滚动、Unicode 章节链接、错误重试和 reduced-motion。生成分享资源、sitemap，验证真实 HTTP 状态、缓存和旧链接映射。

验收：内容/registry/reducer/layout/auto-pan 的针对性测试，随后完整测试、Biome 和 production build。新增浏览器验证重点覆盖直接刷新、浏览器历史、焦点、移动滚动、懒加载请求和 100/1000 篇 fixture；不为静态文章文字写冗余快照。完成这些后再进行正式部署和旧站切换。

## 本轮验证结果与剩余不确定性

- 阅读了两仓库的内容、类型、布局、激活、渲染与构建配置，核对 blog 远程 main 与本地 HEAD。
- `pnpm build` 通过，记录了产物分包和首页 HTML 引用体积；已有大 chunk、重复导入和 use-no-memo 指令相关提示。
- 使用 blog 已安装的 MDX 编译器和 remark-gfm 编译全部 6 个 MDX 文件，通过；检查 Verification asymmetry 两种语言各 13 个字面量本地图片引用，均存在。该检查不等于已完成导入解析或页面视觉验证。
- 查阅了 Vite、MDX、React Router、Base UI 和 Google 的官方资料，并读取 Router 构建插件兼容范围。
- 尚未实施新的 Router/MDX/Vite/React Compiler 联合构建、阅读层动画、静态部署或运行时性能测量。这些是实施第一步和后续验收的具体工作，本轮没有把文档能力当作已验证的集成结果。

本轮产物是研究方案；应用源代码、依赖和部署配置尚未修改。
