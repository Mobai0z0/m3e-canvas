<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/readme/banner-dark.png" />
    <img src="docs/readme/banner-light.png" width="800" alt="M3E Canvas" />
  </picture>
</p>

<p align="center">
  <strong>Sketch Material 3 Expressive screens in the browser, link them, tap through them, and copy a prompt for your AI coding tool.</strong>
</p>

<p align="center">
  <a href="https://github.com/lnkiai/m3e-canvas/stargazers"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/github/stars/lnkiai/m3e-canvas?style=flat-square&logo=github&logoColor=white&color=6750A4&labelColor=1D1B20" /><img alt="GitHub stars" src="https://img.shields.io/github/stars/lnkiai/m3e-canvas?style=for-the-badge&logo=github&logoColor=white&color=6750A4&labelColor=1D1B20" /></picture></a>
  <a href="https://github.com/sponsors/lnkiai"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/github/sponsors/lnkiai?style=flat-square&logo=githubsponsors&logoColor=white&color=7D5260&labelColor=1D1B20" /><img alt="Sponsors" src="https://img.shields.io/github/sponsors/lnkiai?style=for-the-badge&logo=githubsponsors&logoColor=white&color=7D5260&labelColor=1D1B20" /></picture></a>
  <a href="LICENSE"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/badge/license-MIT-625B71?style=flat-square&labelColor=1D1B20" /><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-625B71?style=for-the-badge&labelColor=1D1B20" /></picture></a>
  <br />
  <a href="https://m3.material.io/"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/badge/Material_3-Expressive-6750A4?style=flat-square&logo=materialdesign&logoColor=white&labelColor=1D1B20" /><img alt="Material 3 Expressive" src="https://img.shields.io/badge/Material_3-Expressive-6750A4?style=for-the-badge&logo=materialdesign&logoColor=white&labelColor=1D1B20" /></picture></a>
  <a href="https://nextjs.org/"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/badge/Next.js-16-625B71?style=flat-square&logo=nextdotjs&logoColor=white&labelColor=1D1B20" /><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-625B71?style=for-the-badge&logo=nextdotjs&logoColor=white&labelColor=1D1B20" /></picture></a>
  <a href="https://react.dev/"><picture><source media="(max-width: 767px)" srcset="https://img.shields.io/badge/React-19-625B71?style=flat-square&logo=react&logoColor=61DAFB&labelColor=1D1B20" /><img alt="React 19" src="https://img.shields.io/badge/React-19-625B71?style=for-the-badge&logo=react&logoColor=61DAFB&labelColor=1D1B20" /></picture></a>
</p>

<p align="center">
  <a href="https://trendshift.io/repositories/208608"><img alt="Trendshift: #1 repository of the day" src="https://trendshift.io/api/badge/trendshift/repositories/208608/daily" width="250" height="55" /></a>
</p>

<p align="center"><a href="README.md"><img src="docs/readme/ui/lang-en-on.png" height="40" alt="English" /></a><a href="README.ja.md"><img src="docs/readme/ui/lang-ja.png" height="40" alt="日本語" /></a><a href="README.zh.md"><img src="docs/readme/ui/lang-zh.png" height="40" alt="中文" /></a><a href="README.ko.md"><img src="docs/readme/ui/lang-ko.png" height="40" alt="한국어" /></a></p>

<p align="center"><img src="docs/readme/demo.gif" alt="Sketching the Pantry recipe app in M3E Canvas, tapping through its screens, copying the prompt, Claude Code building it in a terminal, and the finished app running on a phone" /></p>

<p align="center">Sketch the screens, tap through the flow, copy the prompt, and let your AI coding tool build the app. (<a href="docs/readme/demo.mp4">mp4</a>)</p>

M3E Canvas is a free, open-source sketchpad for app screens made of real Material 3 Expressive parts. It runs entirely in your browser: no account, no server, nothing to install. What you sketch becomes a precise prompt that any AI coding tool that takes one, such as Claude Code, Codex, Gemini CLI or Cursor, can turn into a working app.

<p align="center"><a href="https://lnkiai.github.io/m3e-canvas/"><img src="docs/readme/ui/open-en.png" height="56" alt="Open the app" /></a></p>

## What this fork adds

This fork (maintained at [Mobai0z0/m3e-canvas](https://github.com/Mobai0z0/m3e-canvas)) extends the original [lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas) with a **desktop app and a real-project import feature**:

- **Desktop app (Tauri v2)** – run the editor as a native Windows / macOS / Linux app (`npm run tauri:dev` / `npm run tauri:build`). The backend adds a fast directory scanner (prunes `node_modules`, `.git`, `target`, …, normalizes Windows paths) and a folder picker.
- **Import a real project onto the canvas** – point the Project panel at any frontend codebase and it detects the stack from `package.json` (Next.js App/Pages Router, React, Vue, Svelte, Solid, Angular) or `pubspec.yaml` (Flutter), finds the pages/screens (`app/**/page.tsx`, `src/views/**`, `lib/**/*_screen.dart`, …), parses them (Babel for JSX/TSX, a template parser for `.vue`/`.svelte`/`.html`, a string-aware Dart scanner for Flutter widget trees), and maps the widgets it knows (MUI, Ant Design, Chakra, shadcn/ui, generic HTML, and 40+ Flutter Material widgets) onto canvas parts. Unknown components can be mapped by hand (`MyButton=button`, one per line).
- **Flutter labels come out as real text** – `Text(l10n.someKey)` is resolved through the project's `.arb` translations (Chinese preferred, English fallback), so imported Flutter screens show actual UI strings instead of key names.
- **Imports land where they belong** – every parsed screen becomes a frame and its groups flow inside that frame; a screen with too many parts continues on extra frames named `Name · 2` instead of being cut off.
- **Stays smooth with big imports** – frames outside the viewport skip rendering their parts, so importing ~90 screens keeps panning and zooming fluid.
- **A new sky-blue app icon** – the in-app logo mark regenerates every bundle icon (Windows `.ico`, macOS `.icns`, Appx/iOS/Android) via `scripts/gen_icons.py` + `tauri icon`.
- **Release builds from CI** – pushing a `v*` tag runs a GitHub Action that builds the desktop installers for Windows, macOS (Apple Silicon + Intel) and Linux and attaches them to a draft GitHub Release.

本 Fork（[Mobai0z0/m3e-canvas](https://github.com/Mobai0z0/m3e-canvas)）在原项目 [lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas) 基础上新增了**桌面应用**与**真实项目导入**两大能力：

- **Tauri v2 桌面端**：以原生应用运行（`npm run tauri:dev` / `npm run tauri:build`），后端含目录扫描（跳过 `node_modules`/`.git`/`target` 等，Windows 路径归一化）与文件夹选择。
- **把真实项目导入画布**：读取 `package.json`（Next/React/Vue/Svelte/Solid/Angular）或 `pubspec.yaml`（Flutter）识别框架，定位页面文件（`app/**/page.tsx`、`src/views/**`、`lib/**/*_screen.dart` 等），解析成组件树（Babel 解析 JSX/TSX、模板解析器处理 `.vue`/`.svelte`/`.html`、字符串感知的 Dart 扫描器解析 Flutter Widget 树），并把已知组件（MUI、Ant Design、Chakra、shadcn/ui、通用 HTML 及 40+ Flutter Material 组件）映射为画布部件；未知组件可手动映射（`MyButton=button`，每行一条）。
- **Flutter 文案还原为真实文本**：`Text(l10n.someKey)` 会通过项目的 `.arb` 翻译文件解析（优先中文，英文兜底），导入的 Flutter 屏幕显示真实界面文字而非键名。
- **导入自动归位**：每个解析出的屏幕对应一个画布屏幕框，组件组按真实尺寸流入框内；内容过多时自动生成 `名称 · 2` 续页屏幕，不截断。
- **大量导入不卡顿**：视口外的屏幕不渲染内部组件，导入约 90 个屏幕仍能流畅平移缩放。
- **全新天蓝色应用图标**：`scripts/gen_icons.py` + `tauri icon` 从应用内 Logo 一键重生成全部打包图标（Windows `.ico`、macOS `.icns`、Appx/iOS/Android）。
- **CI 自动发布**：推送 `v*` 标签即触发 GitHub Action，为 Windows、macOS（Apple Silicon + Intel）、Linux 构建桌面安装包并挂到 GitHub Release。

## <img src="docs/readme/ui/icon-how.png" width="32" height="32" align="absmiddle" alt="" /> How it works

<picture>
  <source media="(max-width: 767px)" srcset="docs/readme/cards/how-narrow.png" />
  <img src="docs/readme/cards/how-wide.png" alt="The three steps: building a screen from the parts panel, tapping through it in the preview, and copying the prompt" />
</picture>

1. **Sketch** — Drag parts onto phone or desktop screens. They snap together and line up on a 4dp grid.
2. **Tap through** — Link parts to screens and press Preview to try the flow, transitions included.
3. **Copy the prompt** — The whole design becomes a short brief in your language. Paste it into your AI coding tool.

## <img src="docs/readme/ui/icon-features.png" width="32" height="32" align="absmiddle" alt="" /> What's inside

<picture>
  <source media="(max-width: 767px)" srcset="docs/readme/cards/features-narrow.png" />
  <img src="docs/readme/cards/features-wide.png" alt="Four features: a part's own panel, linked screens, the colors panel and the Ask an AI dialog" />
</picture>

<img src="docs/readme/ui/feature-parts.png" width="24" height="24" align="absmiddle" alt="" /> **Real M3 Expressive parts** — Buttons, FABs, bars, tabs, cards, lists, sheets, pickers, carousels, loading indicators and more, each with its own panel for text, style, size and what a tap does.

<img src="docs/readme/ui/feature-flow.png" width="24" height="24" align="absmiddle" alt="" /> **Screens and flow** — Phone and desktop screens, screens that scroll, taps and swipes that open other screens with the transition you pick, and arrows that show the whole flow.

<img src="docs/readme/ui/feature-theme.png" width="24" height="24" align="absmiddle" alt="" /> **Theme in one place** — Color, shape, type and motion: seven palettes or your own seed color, light and dark, three contrast levels, corner styles, fonts and the expressive spring motion.

<img src="docs/readme/ui/feature-ai.png" width="24" height="24" align="absmiddle" alt="" /> **Optional AI help** — Bring your own key to draft a design or write notes for you, or copy an instruction for a coding agent that replies with a share link. Keys never leave your browser.

<details>
<summary><b>Everything it can do</b></summary>

- **Parts** – buttons, icon buttons, FABs and extended FABs, FAB menus, split buttons, chips, top app bars, navigation bars and rails, floating toolbars, tabs, search bars, cards, list items, boxes, bottom sheets, dialogs, snackbars, text fields, dropdowns, switches, checkboxes, radio buttons, sliders, date and time pickers, text, images, carousels, camera and map placeholders, dividers, the shape-morphing loading indicator and wavy progress indicators. Every part has a panel for its text, style, size and alignment, and a trigger tab for what a tap does.
- **Magnetic connections** – bring buttons, chips or list items close and they fuse into a connected group; the corners soften where they meet.
- **Phone and desktop screens** – add as many screens as you like. Switch any screen between a 412×892 phone and a 1280×800 desktop from its label: bars stretch, a navigation bar becomes a rail and back again, and the parts are laid out again. Same-named screens are written into the prompt as one screen at two widths.
- **Screens that scroll** – make a screen longer than its device and its body scrolls under the bars in the preview. Drag the grip on the bottom bezel, or pick 1x to 3x in the screen panel.
- **Tap and swipe to navigate** – give any tappable part, app bar icon or navigation destination a target screen (or "back") and a transition: slide from any side, fade, expand or none. Screens can also open others on a swipe. The preview plays it all, and back runs in reverse.
- **Layers and groups** – a layers panel per screen to change the stacking order; group parts to keep their overlap and move them as one, then copy and paste whole selections across screens.
- **Theme** – seven palettes or one seed color that becomes a full Material 3 scheme you can fine-tune, light and dark, three contrast levels and dynamic color. Square, rounded or full corners for every part at once. Roboto, Roboto Flex, Roboto Serif or the system font. The standard or the expressive spring motion, which also drives the preview.
- **Prompt** – the whole design or a single screen as a concise brief in Japanese, English, Chinese or Korean, with your notes on what each part does. Rows, overlaps and aligned grids of cards are spelled out, so the generated layout keeps them. Choose Android or the web as the target, edit the text before copying, or save a screen as a PNG.
- **Tidy** – one button snaps bars to the edges and the FAB to the corner, joins neighbouring items, and stacks the rest on 16dp margins. Press it again to undo.
- **AI helper (optional)** – bring your own key for OpenAI, Claude, Gemini or DeepSeek to draft a design from a sentence or write a part's behaviour note and a screen's description. Every rewrite can be undone. The request goes straight from your browser to the provider.
- **Share links** – copy a link that opens your design on anyone's canvas, or an instruction for Claude Code, Codex or another agent: it reads [agent.md](public/agent.md), sketches what you described, and replies with such a link.
- **Everything else** – alignment guides and a 4dp grid, undo and redo, keyboard shortcuts, a keyboard-usable parts panel, favorites, install as an app, and autosave in your browser.
- **On a phone** – one fixed screen and a buttons-only editor with bottom sheets. The full editor is for desktop browsers.

</details>

## <img src="docs/readme/ui/icon-keyboard.png" width="32" height="32" align="absmiddle" alt="" /> Keyboard

| Key | Action |
| --- | --- |
| `V` / `H` | Select / hand tool (hold `Space` to pan) |
| Wheel, `Ctrl` + wheel | Pan, zoom |
| `+` `-` `0` | Zoom in, zoom out, fit |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+C` / `Ctrl+V` | Copy / paste parts, also across screens |
| `Ctrl+D` | Duplicate |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / ungroup |
| `Shift` + click | Add to the selection |
| Arrows (`Shift` = 8dp) | Nudge |
| `Ctrl` + drag | Move without snapping (no guides, no 4dp grid) |
| `Delete` | Delete part or screen |
| `P` | Preview |

## <img src="docs/readme/ui/icon-run.png" width="32" height="32" align="absmiddle" alt="" /> Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export to ./out
```

Desktop app (this fork):

```bash
npm run tauri:dev     # run the Tauri desktop app in dev mode
npm run tauri:build   # build installers into src-tauri/target/release/bundle
```

The app is a static Next.js export. To host it under a sub-path (for example a GitHub Pages project site), set `NEXT_PUBLIC_BASE_PATH=/your-repo` at build time. `.github/workflows/deploy.yml` does this and publishes `out/` to GitHub Pages on every push to `main`.

## <img src="docs/readme/ui/icon-contribute.png" width="32" height="32" align="absmiddle" alt="" /> Contributing

Bug reports, part requests and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains the setup, the conventions (English comments, four languages for every string) and where each kind of change lives. Questions go to [Discussions](https://github.com/lnkiai/m3e-canvas/discussions).

## <img src="docs/readme/ui/icon-support.png" width="32" height="32" align="absmiddle" alt="" /> Support

M3E Canvas is free and MIT-licensed, and stays that way. If it saves you time, you can [sponsor the work on GitHub](https://github.com/sponsors/lnkiai); it pays for the hours that go into new parts, the prompt, and reviewing contributions. No feature is behind sponsorship.

<p><a href="https://github.com/sponsors/lnkiai"><img src="docs/readme/ui/sponsor-en.png" height="48" alt="Sponsor on GitHub" /></a></p>

Thanks to the sponsors who keep this going:

<!-- sponsors:start -->
<p><a href="https://github.com/YspritanHyzygy" title="YspritanHyzygy"><img src="docs/readme/people/YspritanHyzygy.png" width="52" height="52" alt="YspritanHyzygy" /></a></p>
<!-- sponsors:end -->

## <img src="docs/readme/ui/icon-thanks.png" width="32" height="32" align="absmiddle" alt="" /> Thanks

Thanks to everyone who has contributed code, ideas and reviews:

<!-- contributors:start -->
<p><a href="https://github.com/CQMHV" title="CQMHV"><img src="docs/readme/people/CQMHV.png" width="52" height="52" alt="CQMHV" /></a> <a href="https://github.com/Cokedog320" title="Cokedog320"><img src="docs/readme/people/Cokedog320.png" width="52" height="52" alt="Cokedog320" /></a> <a href="https://github.com/Grenish" title="Grenish"><img src="docs/readme/people/Grenish.png" width="52" height="52" alt="Grenish" /></a> <a href="https://github.com/YspritanHyzygy" title="YspritanHyzygy"><img src="docs/readme/people/YspritanHyzygy.png" width="52" height="52" alt="YspritanHyzygy" /></a> <a href="https://github.com/andrewwbuilds" title="andrewwbuilds"><img src="docs/readme/people/andrewwbuilds.png" width="52" height="52" alt="andrewwbuilds" /></a> <a href="https://github.com/rishabhiskawai" title="rishabhiskawai"><img src="docs/readme/people/rishabhiskawai.png" width="52" height="52" alt="rishabhiskawai" /></a> <a href="https://github.com/j-token" title="j-token"><img src="docs/readme/people/j-token.png" width="52" height="52" alt="j-token" /></a> <a href="https://github.com/FlyGues2889" title="FlyGues2889"><img src="docs/readme/people/FlyGues2889.png" width="52" height="52" alt="FlyGues2889" /></a> <a href="https://github.com/xiehuanyi" title="xiehuanyi"><img src="docs/readme/people/xiehuanyi.png" width="52" height="52" alt="xiehuanyi" /></a> <a href="https://github.com/Razshy" title="Razshy"><img src="docs/readme/people/Razshy.png" width="52" height="52" alt="Razshy" /></a> <a href="https://github.com/aakash-kharb" title="aakash-kharb"><img src="docs/readme/people/aakash-kharb.png" width="52" height="52" alt="aakash-kharb" /></a> <a href="https://github.com/kevin9327" title="kevin9327"><img src="docs/readme/people/kevin9327.png" width="52" height="52" alt="kevin9327" /></a></p>
<!-- contributors:end -->

## <img src="docs/readme/ui/icon-credits.png" width="32" height="32" align="absmiddle" alt="" /> Credits

- Loading indicator shapes and animation model: [material-components-android](https://github.com/material-components/material-components-android) (Apache-2.0) via [Aler1x/m3-loading-indicator](https://github.com/Aler1x/m3-loading-indicator). See `NOTICE`.
- Icons: [Material Symbols](https://fonts.google.com/icons) (Apache-2.0). Fonts are loaded from Google Fonts.

## <img src="docs/readme/ui/icon-seealso.png" width="32" height="32" align="absmiddle" alt="" /> See also

- [matraic/m3e](https://github.com/matraic/m3e) – Material 3 Expressive as Lit web components (MIT), with React bindings and an icon package. A good home for the screens you sketch here.
- [Beer CSS](https://www.beercss.com/) – Material Design 3 as a plain CSS framework (MIT). Another way to build the web version of a screen you sketch here.

## <img src="docs/readme/ui/icon-contact.png" width="32" height="32" align="absmiddle" alt="" /> Contact

For anything that does not fit an issue, such as collaboration or press, get in touch:

<p><a href="mailto:info@lnkiai.com"><img src="docs/readme/ui/contact-mail.png" height="48" alt="info@lnkiai.com" /></a><a href="https://x.com/lnkiai"><img src="docs/readme/ui/contact-x.png" height="48" alt="@lnkiai on X" /></a></p>

## <img src="docs/readme/ui/icon-license.png" width="32" height="32" align="absmiddle" alt="" /> License

MIT © lnkiai
