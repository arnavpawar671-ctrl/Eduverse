/**
 * Client helpers for the Voice AI Tutor: microphone recording,
 * speech-to-text and streaming text-to-speech playback.
 */
import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to use voice features.");
  return { Authorization: `Bearer ${token}` };
}

/* ==================== Microphone recording ==================== */

export type Recorder = { stop: () => Promise<Blob> };

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(250);
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: "audio/webm" }));
        };
        recorder.stop();
      }),
  };
}

/* ==================== Speech-to-text ==================== */

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([blob], { type: "audio/webm" }), "speech.webm");
  const res = await fetch("/api/ai/transcribe", {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Speech recognition failed (${res.status}). ${detail.slice(0, 160)}`);
  }
  let text = "";
  let errored: Error | null = null;
  const parser = createParser({
    onEvent(event) {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          delta?: string;
          text?: string;
          error?: unknown;
        };
        if (payload.type === "transcript.text.done" && payload.text != null) {
          text = payload.text;
          return;
        }
        if (payload.type === "transcript.text.delta" && payload.delta) {
          text += payload.delta;
          return;
        }
        if (payload.type === "error" || payload.error) {
          errored = new Error(`Speech recognition failed. ${event.data.slice(0, 160)}`);
        }
      } catch {
        /* ignore malformed frames */
      }
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      parser.feed(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (errored) throw errored;
  return text.trim();
}

/* ==================== Text-to-speech (streamed PCM playback) ==================== */

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) view.getInt16(i * 2, true) / 32768;
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

const speakRegistry = new Set<AbortController>();

export function stopSpeaking() {
  speakRegistry.forEach((c) => c.abort());
}

export async function speakText(text: string): Promise<void> {
  stopSpeaking();
  const controller = new AbortController();
  speakRegistry.add(controller);
  const signal = controller.signal;
  const context = new AudioContext({ sampleRate: 24000 });
  const sources = new Set<AudioBufferSourceNode>();
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let samplesPlayed = 0;
  const abort = () => {
    for (const source of sources) source.stop();
  };
  signal.addEventListener("abort", abort, { once: true });
  let playback: Promise<void> = Promise.resolve();
  try {
    if (context.state === "suspended") await context.resume();
    const res = await fetch("/api/ai/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`Speech failed (${res.status}).`);
    const parser = createParser({
      onEvent(event) {
        const payload = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (payload.type === "error" || payload.error) throw new Error(`Speech failed. ${event.data}`);
        if (payload.type === "speech.audio.done") {
          completed = true;
          return;
        }
        if (payload.type !== "speech.audio.delta") return;
        if (completed || !payload.audio) throw new Error("Invalid speech audio event");
        const decoded = decodePCM(pending, Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0)));
        pending = new Uint8Array(decoded.pending);
        if (!decoded.samples.length) return;
        samplesPlayed += decoded.samples.length;
        const buffer = context.createBuffer(1, decoded.samples.length, 24000);
        buffer.copyToChannel(decoded.samples, 0);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sources.add(source);
        playback = new Promise<void>((resolve) => {
          source.onended = () => {
            sources.delete(source);
            resolve();
          };
        });
        playhead = Math.max(playhead, context.currentTime + 0.05);
        source.start(playhead);
        playhead += buffer.duration;
      },
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        parser.feed(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    if (!completed || !samplesPlayed) throw new Error("Speech was incomplete. Please try again.");
    await playback;
  } finally {
    signal.removeEventListener("abort", abort);
    controller.abort();
    for (const source of sources) source.stop();
    speakRegistry.delete(controller);
    await context.close().catch(() => undefined);
  }
}

/** Strip markdown so spoken output sounds natural. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (code example omitted) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 4000);
}
