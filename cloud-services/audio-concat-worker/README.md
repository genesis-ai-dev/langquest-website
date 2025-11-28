# Audio Concatenation Worker

Cloudflare Worker for concatenating multiple audio segments into a single MP3 file.

## Purpose

This worker processes audio concatenation requests from the LangQuest export API. It:
- Downloads multiple audio segments
- Concatenates them using ffmpeg-wasm
- Uploads the result to R2 storage
- Returns the output URL and duration

## Local Development

For local development, run the worker with wrangler dev:

```bash
cd cloud-services/audio-concat-worker
npm install
npm run dev
```

This will start the worker on `http://localhost:8787` (default port).

**Important**: Make sure to set `AUDIO_CONCAT_WORKER_URL=http://localhost:8787` in your Next.js `.env.local` file when developing locally.

## Deployment

```bash
cd cloud-services/audio-concat-worker
npm install
npm run deploy
```

## Known Issues

⚠️ **FFmpeg.wasm may not work in Cloudflare Workers**: The `@ffmpeg/ffmpeg` library uses Web Workers, which are not fully supported in Cloudflare Workers. This worker may need to be refactored to:
- Use a Node.js service instead of Cloudflare Workers
- Use Cloudflare's Stream API for media processing
- Use a different audio processing library compatible with Workers

## Environment Variables

Set in Cloudflare dashboard:
- `LANGQUEST_SUPABASE_URL` - Supabase project URL (for downloading source audio)
- `LANGQUEST_SUPABASE_SERVICE_KEY` - Service role key (if needed for auth)

## API

**POST** `/concat`

Request body:
```json
{
  "audioUrls": ["https://...", "https://..."],
  "outputKey": "export-123.mp3",
  "format": "mp3"
}
```

Response:
```json
{
  "success": true,
  "audioUrl": "exports/export-123.mp3",
  "durationMs": 180000
}
```

## Limitations

- Maximum 100 audio segments per request (to prevent timeout)
- Worker timeout: 30 seconds (Cloudflare free tier) or 15 minutes (paid)
- Large chapters may need chunked processing

