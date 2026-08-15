/**
 * Video Recorder — captures the WebGL canvas stream as a 30-second WebM clip.
 * Uses MediaRecorder API + canvas.captureStream(30fps).
 */

import React, { useCallback, useRef, useState } from 'react';
import { Video, Download, Circle, Square } from 'lucide-react';

interface VideoRecorderProps {
  /** Ref to the Three.js renderer DOM element (the WebGL canvas) */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isVisible: boolean;
}

type RecordState = 'idle' | 'recording' | 'processing' | 'done';

export function VideoRecorder({ canvasRef, isVisible }: VideoRecorderProps) {
  const [state, setState] = useState<RecordState>('idle');
  const [countdown, setCountdown] = useState(30);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setState('processing');
  }, []);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert('Globe canvas not ready. Please wait for the 3D view to load.');
      return;
    }

    // Reset state
    chunksRef.current = [];
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setCountdown(30);

    // Capture canvas stream at 30fps
    const stream = (canvas as any).captureStream?.(30);
    if (!stream) {
      alert('Your browser does not support canvas.captureStream(). Try Chrome or Edge.');
      return;
    }

    // Prefer VP9 for quality, fall back to VP8
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000, // 8 Mbps
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setState('done');
    };

    recorder.start(100); // collect chunks every 100ms
    setState('recording');

    // Countdown timer — auto-stop at 30s
    let remaining = 30;
    timerRef.current = setInterval(() => {
      remaining--;
      setCountdown(remaining);
      if (remaining <= 0) {
        stopRecording();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  }, [canvasRef, blobUrl, stopRecording]);

  const downloadVideo = useCallback(() => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `solar-eclipse-2026-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [blobUrl]);

  const reset = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setState('idle');
    setCountdown(30);
  }, [blobUrl]);

  if (!isVisible) return null;

  return (
    <div className="bg-[#0a0f1a]/90 backdrop-blur-md border border-red-500/25 rounded-xl p-3 shadow-xl text-xs font-mono w-56">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-500/20">
        <Video className="w-3.5 h-3.5 text-red-400" />
        <div className="text-red-300 font-bold tracking-wider text-[11px] uppercase">Video Recorder</div>
        {state === 'recording' && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-red-400">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            REC
          </span>
        )}
      </div>

      {state === 'idle' && (
        <div>
          <p className="text-slate-400 text-[10px] leading-relaxed mb-3">
            Records a 30-second cinematic clip of the 3D eclipse simulation as WebM video.
          </p>
          <button
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 rounded-lg transition-all font-bold tracking-wider text-[11px] uppercase"
          >
            <Circle className="w-3.5 h-3.5 fill-red-500 text-red-500" />
            Start Recording
          </button>
        </div>
      )}

      {state === 'recording' && (
        <div className="text-center">
          {/* Countdown ring */}
          <div className="relative w-16 h-16 mx-auto mb-3">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray={`${(countdown / 30) * 100} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-red-300 font-bold text-lg">
              {countdown}
            </div>
          </div>
          <div className="text-slate-400 text-[10px] mb-3">Recording in progress…</div>
          <button
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/40 hover:bg-red-900/30 border border-slate-600 text-slate-300 rounded-lg transition-all font-bold text-[11px] uppercase"
          >
            <Square className="w-3 h-3 fill-slate-400 text-slate-400" />
            Stop Early
          </button>
        </div>
      )}

      {state === 'processing' && (
        <div className="text-center py-3">
          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-slate-400 text-[10px]">Encoding video…</div>
        </div>
      )}

      {state === 'done' && (
        <div>
          <div className="flex items-center gap-1.5 text-emerald-300 mb-2 text-[11px]">
            <span>✅</span>
            <span>Recording complete!</span>
          </div>
          <p className="text-slate-400 text-[10px] mb-3 leading-relaxed">
            30-second WebM clip ready. Plays in Chrome, Firefox, VLC.
          </p>
          <button
            onClick={downloadVideo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/50 text-emerald-300 rounded-lg transition-all font-bold text-[11px] uppercase mb-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download (.webm)
          </button>
          <button
            onClick={reset}
            className="w-full text-slate-500 hover:text-slate-300 text-[10px] transition-colors py-1"
          >
            Record another clip
          </button>
        </div>
      )}
    </div>
  );
}
