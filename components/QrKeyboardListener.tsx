import React, { useEffect, useRef } from 'react';
import { db } from '../services/db';

/**
 * Global hidden input listener for keyboard-wedge scanners (USB HID).
 * - Focuses a hidden input so scanners "type" into it
 * - Parses JSON payloads like { n, c, e }
 * - Calls `visitService.processQrScan` and dispatches a `qr-scanned` event with the result
 */
export const QrKeyboardListener: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);

  const isUserTypingActive = () => {
    try {
      const ae = document.activeElement as HTMLElement | null;
      if (!ae) return false;
      const tag = ae.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if ((ae as HTMLElement).isContentEditable) return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    // Only focus the hidden input when the user is NOT actively typing
    const tryFocus = () => {
      if (!isUserTypingActive()) inputRef.current?.focus();
    };

    tryFocus();

    const onWindowFocus = () => tryFocus();
    const onDocClick = () => setTimeout(() => tryFocus(), 0);

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('click', onDocClick);

    return () => {
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('click', onDocClick);
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      inputMode="none"
      style={{ position: 'absolute', left: -9999, opacity: 0, pointerEvents: 'none' }}
      onChange={(e) => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(async () => {
          const value = (e.target as HTMLInputElement).value.trim();
          if (!value) {
            inputRef.current && (inputRef.current.value = '');
            if (!isUserTypingActive()) inputRef.current?.focus();
            return;
          }

          let parsed: any = null;
          try {
            parsed = JSON.parse(value);
          } catch (err) {
            // not JSON, ignore
            inputRef.current && (inputRef.current.value = '');
            inputRef.current?.focus();
            return;
          }

          if (!parsed?.n || !parsed?.c || !parsed?.p) {
            inputRef.current && (inputRef.current.value = '');
            inputRef.current?.focus();
            return;
          }

          const normalized = JSON.stringify(parsed);
          const now = Date.now();
          if (lastScanRef.current && lastScanRef.current.value === normalized && now - lastScanRef.current.time < 3000) {
            inputRef.current && (inputRef.current.value = '');
            if (!isUserTypingActive()) inputRef.current?.focus();
            return;
          }
          lastScanRef.current = { value: normalized, time: now };

          try {
            const result = await db.processQrScan(normalized);
            // Dispatch a global event so other parts of the app can react
            try {
              window.dispatchEvent(new CustomEvent('qr-scanned', { detail: { parsed, result } }));
            } catch (e) {
              // ignore non-critical
            }
            console.log('QR processed by QrKeyboardListener:', result);
          } catch (err) {
            console.error('QrKeyboardListener error:', err);
          } finally {
            inputRef.current && (inputRef.current.value = '');
            if (!isUserTypingActive()) inputRef.current?.focus();
          }
        }, 200);
      }}
      onBlur={() => setTimeout(() => { if (!isUserTypingActive()) inputRef.current?.focus(); }, 0)}
    />
  );
};

export default QrKeyboardListener;
