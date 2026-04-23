---
name: Media Text Overlay Editor
description: In-app text editor for images/videos in CreatePost — burns text into media (canvas for images, MediaRecorder for videos to .webm)
type: feature
---
VibeBaze includes a full-screen text overlay editor accessible from CreatePost after selecting image or video media. Users tap "Add text to media" to launch `MediaTextEditor` (src/components/editor/).

Architecture:
- `src/lib/editor/textLayer.ts` — TextLayer model + Canvas drawing (gradient fill, stroke, shadow, neon glow, pill background, rotation, multiline). 8 fonts, 8 color swatches, 5 Vibe presets (classic, neon, glass, caption, kenya).
- `src/lib/editor/renderers.ts` — `renderImageWithText` (Canvas → JPEG File) and `renderVideoWithText` (Canvas + MediaRecorder → .webm File with audio passthrough via HTMLVideoElement.captureStream).
- Coordinates normalized 0–1 so layers scale to any resolution.
- Drag to move, rotate button (15° steps), resize via slider.

Persistence: text is BURNED into the file before upload — never stored separately. Downloads/shares always include the text.

Video output is .webm (browser-native MediaRecorder). Server-side FFmpeg was rejected because Supabase Edge Functions don't support subprocesses.