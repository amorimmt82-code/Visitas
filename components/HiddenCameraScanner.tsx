import React, { useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { db } from '../services/db';

/** Scan interval in ms — ~5 fps is plenty for QR detection */
const SCAN_INTERVAL_MS = 200;

/**
 * Hidden camera QR scanner.
 * Runs the device camera in the background (invisible) and continuously
 * scans for QR codes. When a valid QR is detected, it processes the scan
 * and dispatches a 'qr-scanned' event — the same event used by
 * QrKeyboardListener, so ExitPage works seamlessly with both methods.
 */
export const HiddenCameraScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && !processingRef.current) {
      const now = Date.now();
      const normalized = code.data.trim();

      // Deduplicate: ignore same scan within 5 seconds
      if (
        lastScanRef.current &&
        lastScanRef.current.value === normalized &&
        now - lastScanRef.current.time < 5000
      ) {
        scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
        return;
      }

      // Validate it's a JSON QR from our system
      let parsed: any = null;
      try {
        parsed = JSON.parse(normalized);
      } catch {
        // Not JSON — ignore
        scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
        return;
      }

      if (!parsed?.n || !parsed?.c || !parsed?.p) {
        scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
        return;
      }

      lastScanRef.current = { value: normalized, time: now };
      processingRef.current = true;

      try {
        const result = await db.processQrScan(normalized);
        try {
          window.dispatchEvent(
            new CustomEvent('qr-scanned', { detail: { parsed, result } })
          );
        } catch {
          // ignore non-critical
        }
        console.log('📷 Camera QR scan processed:', result);
      } catch (err) {
        console.error('📷 Camera QR scan error:', err);
      } finally {
        processingRef.current = false;
      }
    }

    scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          scanTimerRef.current = setTimeout(scanFrame, SCAN_INTERVAL_MS);
        }
      } catch (err) {
        console.warn('📷 Camera not available for QR scanning:', err);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [scanFrame, stopCamera]);

  return (
    <>
      {/* Video & canvas are completely hidden — no visual footprint */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

export default HiddenCameraScanner;
