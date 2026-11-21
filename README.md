# 🎬 WebClip Studio

### A Browser-Based Video Editing Studio Built with HTML5, CSS3 & Vanilla JavaScript

**Create. Refine. Bring Your Story to Life.**

WebClip Studio is a responsive, browser-based video editing application built using **HTML5, CSS3 and Vanilla JavaScript (ES6+)**.

It brings together a canvas-based composition preview, multi-track timeline, local media management, clip editing controls, project save/open workflows and browser-based WebM video recording in one interactive workspace.

Designed as a frontend engineering portfolio project, WebClip Studio explores how modern browser APIs can be combined to build a practical media-editing experience without depending on third-party frontend frameworks or video-editing libraries.

---

## ✨ Overview

WebClip Studio combines three main experiences:

- **🎬 Video Editing Workspace** — Import local media, organize clips, create text overlays, adjust supported visual properties and work with audio.
- **⚙️ Browser-Native Architecture** — Modular JavaScript systems for media management, timeline editing, canvas rendering, playback, project handling and export.
- **🎨 Responsive Creative Interface** — A dedicated Welcome screen and adaptable desktop, tablet and mobile editing layouts with persistent Light and Dark themes.

### Key Features

| Area | Features |
|---|---|
| Media Management | Local video and audio importing, media library and metadata inspection |
| Timeline | Video, Text and Audio tracks, clip selection, movement and trimming |
| Clip Editing | Video splitting, supported duplication, deletion and text editing |
| Preview | Canvas-based composition rendering, playback, seeking and frame stepping |
| Inspector | Supported clip properties and visual adjustments |
| Audio | Volume, mute and browser-based audio processing |
| Editing History | Undo and redo for supported editing operations |
| Project Management | JSON-based project save, open, validation and media reconnection |
| Export | Browser-based WebM recording using Canvas Capture and MediaRecorder |
| Interface | Responsive layouts, mobile editing sheets and Editing Focus mode |
| Themes | Persistent Light and Dark theme selection |

---

## 🎞️ Video Editing Workspace

The Editor Workspace provides a lightweight environment for arranging and refining video compositions directly in the browser.

### Editing Capabilities

- Import local video and audio files.
- Inspect available media metadata.
- Work with Video, Text and Audio timeline tracks.
- Select and reposition timeline clips.
- Adjust source in/out points for supported clips.
- Split video clips at the playhead.
- Duplicate supported clips.
- Delete selected clips.
- Create and edit text overlays.
- Adjust supported clip properties through the Inspector.
- Apply brightness, contrast and grayscale adjustments to supported video clips.
- Control audio volume and mute state.
- Zoom and fit the timeline to the composition duration.

### Canvas Preview & Playback

The preview system uses the **HTML5 Canvas 2D API** to render the current composition.

Available controls include:

- Play and pause.
- Timeline seeking.
- Playhead navigation.
- Frame stepping.
- Preview volume adjustment.
- Composition rendering.
- Centered 16:9 preview presentation.

---

## 🧭 Editing Workspace

The editing interface is organized around the Media Library, Preview, Inspector and Timeline.

### Desktop Workspace

| Area | Responsibility |
|---|---|
| Media Library | Displays imported video and audio assets |
| Preview | Renders the current composition using Canvas |
| Inspector | Provides editing controls for the selected clip |
| Timeline | Organizes Video, Text and Audio clips |
| Editor Header | Provides project information, theme, save and export actions |
| Command Menus | Groups File, Edit, View, Tools and Help commands |

### Responsive Editing Experience

The workspace adapts its layout according to the available screen size.

| Device / Mode | Layout |
|---|---|
| Desktop | Media Library, Preview and Inspector with Timeline below |
| Tablet | Preview-focused layout with supporting panels reorganized |
| Mobile | Full-width 16:9 Preview with Timeline directly below |
| Mobile Tools | Media Library and Inspector open as contextual bottom sheets |
| Editing Focus | Hides supporting panels to provide more room for the Preview and Timeline |

### Mobile Navigation

The mobile editing interface provides access to common editing actions through its navigation drawer:

- **Import Video / Import Audio** — Open the corresponding local file picker.
- **Add Text Overlay** — Create a text clip.
- **Media Library** — Open the Media Library bottom sheet.
- **Inspector** — Open the Inspector bottom sheet.
- **Editing Focus** — Enter or exit the focused editing layout.

The Media Library and Inspector sheets support dismissal through their close controls, backdrop and Escape key.

Their hidden and inert states are synchronized when the viewport crosses the mobile breakpoint.

The mobile interface uses contextual bottom sheets rather than an additional fixed bottom toolbar.

---

## 🎨 Welcome Screen & Visual Identity

WebClip Studio includes a dedicated Welcome screen that introduces the application and provides access to the editing workspace.

### Welcome Experience

- Cinematic product introduction.
- WebClip Studio branding and tagline.
- Main navigation.
- Feature presentation.
- Editing workflow introduction.
- Theme selection.
- Start Editing actions.
- Responsive navigation.
- Shared Welcome and Editor footer design.

### Dual Theme System

The application supports persistent Light and Dark themes through sun and moon controls.

**☀️ Light Theme**

- Soft, light interface surfaces.
- Lavender-inspired visual accents.
- Clean workspace presentation.
- Balanced visual contrast.

**🌙 Dark Theme**

- Charcoal-violet interface surfaces.
- Dark workspace presentation.
- Consistent styling across the application.
- No pure-black theme treatment.

Theme selection is persisted through browser storage and applies across the Welcome screen and Editor Workspace.

---

## 🧩 Shared Welcome & Editor Footer

The Welcome screen and Editor Workspace use a shared footer design to maintain visual consistency.

The footer includes:

- WebClip Studio branding.
- Tagline and description.
- Social and contact links.
- Explore navigation.
- Studio navigation.
- Copyright information.
- Responsive layout and theme styling.

The editor-specific footer uses separate element IDs where required to avoid duplicate HTML IDs.

The footer appears after the editing workspace and does not overlay the Timeline or editing controls.

---

## 💾 Project Management

WebClip Studio includes browser-based project save and open workflows.

### Project Capabilities

- Create and name projects.
- Save project data.
- Open previously saved projects.
- Serialize project data into JSON.
- Validate imported project data.
- Preserve timeline information and media references.
- Reconnect source media when reopening a project.

### Project File Format

Projects use the `.webclip.json` file extension.

Project files preserve editing decisions, timeline data and references to imported media.

**Media Reconnection**

Project files do not contain the original video or audio file bytes.

When reopening a saved project, the corresponding source media must be imported again so that matching assets can reconnect to the saved timeline.

---

## 🎥 Browser-Based Video Export

WebClip Studio uses browser-native recording capabilities to export the rendered composition.

### Export Technologies

- Canvas capture.
- MediaRecorder API.
- Supported WebM recording MIME types.
- Web Audio API integration when available.
- AudioContext.
- MediaStreamDestination.

### Export Workflow

1. Prepare the editing composition.
2. Choose the Export action.
3. Check available browser recording capabilities.
4. Capture the rendered preview canvas.
5. Include supported audio sources through the available Web Audio workflow.
6. Record the composition in real time.
7. Generate and download the resulting WebM video.

> **Export Scope:** Export runs in the current browser tab and records the composition in real time. Keep the tab open until recording finishes. Supported codecs, browser APIs, available memory and device processing power can affect the export experience.

---

## 🔊 Audio Processing

WebClip Studio uses the **Web Audio API** for supported audio processing and mixing workflows.

### Audio Capabilities

- Local audio importing.
- Audio metadata inspection.
- Background audio placement.
- Clip volume control.
- Individual audio mute control.
- Preview audio synchronization.
- Supported source and background audio mixing during export.

Audio export depends on browser Web Audio support and compatible source media.

---

## 🧠 Timeline Editing System

The Timeline is one of the central parts of the editing workspace.

### Track Types

| Track | Purpose |
|---|---|
| Video | Video clip arrangement |
| Text | Text overlay placement |
| Audio | Audio clip arrangement |

### Timeline Operations

- Clip selection.
- Clip movement and positioning.
- Source trimming.
- Video splitting.
- Supported clip duplication.
- Clip deletion.
- Playhead navigation.
- Timeline zoom.
- Fit-to-duration.
- Undo and redo.

### Editing History

WebClip Studio provides undo and redo functionality for supported project editing operations.

The application maintains a bounded editing history using its configured history limit.

---

## 🎨 Inspector & Visual Adjustments

The Inspector provides editing controls for the currently selected clip.

### Supported Video Adjustments

- Brightness.
- Contrast.
- Grayscale.

Available controls depend on the selected clip type and its supported editing properties.

### Text Overlay Editing

The Text track supports creating and editing text clips.

Available functionality includes:

- Text clip creation.
- Timeline placement.
- Text content editing.
- Supported display property editing.
- Inspector-based editing.

---

## ⌨️ Keyboard Shortcuts

WebClip Studio provides keyboard shortcuts for common editing operations.

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `Ctrl / Cmd + Z` | Undo |
| `Ctrl / Cmd + Y` | Redo |
| `Shift + Ctrl / Cmd + Z` | Redo |
| `Ctrl / Cmd + D` | Duplicate Selected Clip |
| `Ctrl / Cmd + S` | Save Project |
| `Ctrl / Cmd + O` | Open Project |
| `Delete / Backspace` | Delete Selected Clip |
| `Escape` | Close open menus, navigation drawer or mobile sheet |

Shortcuts that could interfere with text entry are ignored while the user is editing text fields.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure and interface |
| CSS3 | Styling, responsive layouts and themes |
| Vanilla JavaScript ES6+ | Application logic and interactions |
| JavaScript ES Modules | Modular application architecture |
| Canvas 2D API | Composition preview rendering |
| File API | Local media and project file handling |
| Web Audio API | Supported audio processing and mixing |
| MediaRecorder API | Browser-based WebM recording |
| LocalStorage | Persistent theme and application settings |
| requestAnimationFrame() | Browser rendering coordination |
| Native Browser APIs | Media, input and runtime integration |

**No third-party frontend framework or video-editing framework is required.**

The application is built with Vanilla JavaScript and browser-native technologies.

---

## 📂 Project Structure

```text
WebClip-Studio/
│
├── assets/
│   └── icons/
│       └── webclip-mark.svg
│
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── dialogs.css
│   ├── landing-ui.css
│   ├── theme.css
│   ├── landing.css
│   ├── edit.css
│   └── tools.css
│
├── js/
│   ├── main.js
│   ├── config.js
│   │
│   ├── core/
│   │   ├── app.js
│   │   ├── project.js
│   │   └── state.js
│   │
│   ├── features/
│   │   ├── export.js
│   │   ├── inspector.js
│   │   ├── media.js
│   │   ├── preview.js
│   │   └── timeline.js
│   │
│   ├── ui/
│   │   ├── interface.js
│   │   └── theme.js
│   │
│   └── utils/
│       └── helpers.js
│
├── index.html
└── README.md
```

### JavaScript Module Responsibilities

| Module | Responsibility |
|---|---|
| `main.js` | Browser entry point and application startup |
| `config.js` | Shared defaults, application configuration and recording capability detection |
| `core/app.js` | Application composition, shared context, history and render coordination |
| `core/state.js` | Application state, project initialization and DOM element references |
| `core/project.js` | Project model, clip factories, duration and validation |
| `features/media.js` | Local media import, metadata, Media Library and source lifecycle |
| `features/timeline.js` | Timeline rendering, selection, clip operations, zoom and splitting |
| `features/preview.js` | Canvas composition, playback, seeking and audio preview synchronization |
| `features/inspector.js` | Selected clip properties and editing controls |
| `features/export.js` | Browser capability checks and WebM canvas recording |
| `ui/theme.js` | Theme persistence and theme toggle behavior |
| `ui/interface.js` | Welcome/Editor navigation, project files, menus, mobile sheets, focus mode and keyboard shortcuts |
| `utils/helpers.js` | Formatting, safe strings, DOM helpers and downloads |

### CSS Architecture

The project uses exactly eight dedicated CSS files, organized by interface responsibility.

| Stylesheet | Responsibility |
|---|---|
| `base.css` | Reset, typography and global foundations |
| `layout.css` | Welcome and application layout foundations |
| `dialogs.css` | Dialogs, form fields, validation states and dialog actions |
| `landing-ui.css` | Landing header, feature sections, cards and footer refinements |
| `theme.css` | Dark-theme refinements and shared visual overrides |
| `landing.css` | Welcome screen presentation and responsive refinements |
| `edit.css` | Editor shell, workspace, navigation and editing layout |
| `tools.css` | Inspector, media controls, timeline tools and editor refinements |

The stylesheets are loaded in a defined order to preserve the intended CSS cascade.

The project does not use `:root` selectors or CSS custom properties.

---

## 🌐 Browser & Media Compatibility

For the most reliable experience, use a current version of Chrome, Edge or another modern Chromium-based browser.

Media support varies by browser, operating system and installed codecs.

- A file extension alone does not guarantee that a browser can decode a media file.
- Video preview depends on browser media-element and codec support.
- Video export requires `MediaRecorder`, a supported WebM recording MIME type and canvas capture support.
- Audio mixing depends on Web Audio API availability.
- Export runs in real time in the current browser tab.
- Large or high-resolution projects can require significant processing power and memory.
- Some browsers require user interaction before media playback can begin.

---

## 🔒 Media Privacy & Project Storage

WebClip Studio follows a local-first browser workflow.

- Imported source files are processed locally by the browser.
- The application does not require a remote media-upload service.
- Media preview uses temporary browser object URLs.
- Project JSON files store timeline data and media references, not original media bytes.
- Source media must be re-imported when reopening a project to reconnect matching assets.
- Refreshing the application or ending the browser session may require source media to be imported again.

---

## 📌 Technical Scope & Limitations

WebClip Studio is designed for lightweight, short-form editing rather than long-form professional production.

- It is not a replacement for a professional non-linear video editor.
- Advanced transitions, keyframes, multi-layer compositing and professional color grading are not currently provided.
- Support for every video and audio codec is not guaranteed.
- WebM export depends on browser recording and canvas capture capabilities.
- Export runs in real time and can be limited by CPU, memory, battery and thermal constraints.
- Project files do not package original media bytes.
- Source files must be re-imported to reconnect them to saved projects.
- Mobile editing precision depends on screen size and touch input accuracy.

---

## 🧪 Testing & Quality Assurance

All planned project testing has been completed successfully.

The application has been tested across its core editing workflows, interface behavior and responsive layouts.

### Verified Testing Areas

- Welcome screen and navigation.
- Light and Dark theme switching.
- Video and audio importing.
- Media metadata inspection.
- Preview playback and seeking.
- Video, Text and Audio timeline tracks.
- Clip selection and movement.
- Clip trimming and splitting.
- Supported clip duplication and deletion.
- Inspector property editing.
- Undo and redo.
- Project save and open.
- Source-media reconnection.
- WebM export and downloaded video playback.
- Supported audio preview and export.
- Mobile navigation drawer.
- Media Library and Inspector bottom sheets.
- Editing Focus mode.
- Desktop, tablet and mobile layouts.
- Browser console and media compatibility checks.

**Testing Status: Successfully Completed.**

Media decoding and recording capabilities can still vary across browsers, operating systems and devices.

---

## 🏗️ Engineering Principles

**Browser-Native Development**
Uses native browser APIs for media handling, rendering, playback and recording.

**Modular Architecture**
Separates application responsibilities into dedicated JavaScript modules.

**Responsive Interface Design**
Adapts the editing workspace to desktop, tablet and mobile environments.

**Local-First Media Workflow**
Keeps media importing, preview and project operations within the browser.

**Reusable Editing Systems**
Organizes Timeline, Preview, Media, Inspector and Export responsibilities into separate feature modules.

**Technical Transparency**
Documents implemented functionality, browser-dependent capabilities and known limitations.

---

## 🐙 GitHub Repository

WebClip Studio is structured as a self-contained static frontend project and can be hosted through static web hosting services that support HTML, CSS and JavaScript modules.

### Suggested Repository Description

> A responsive browser-based video editing studio built with HTML5, CSS3, Vanilla JavaScript, Canvas and MediaRecorder, featuring a multi-track timeline, local media management and a dedicated mobile editing workspace.

---

## 👨‍💻 Author

### Ravi Yadav

WebClip Studio is developed as a frontend engineering portfolio project, focusing on responsive interface design, browser media APIs, modular JavaScript architecture and interactive editing workflows.

---

**🎬 WebClip Studio**

*Create. Refine. Bring Your Story to Life.*

**Built with 💜 by Ravi Yadav**