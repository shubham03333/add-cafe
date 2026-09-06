'use client';

import { useRef, type MouseEvent, type PointerEvent } from 'react';

type LongPressHandlers = {
  onPointerDown: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
  onClickCapture: (event: MouseEvent) => void;
};

export function useLongPress(onLongPress: () => void, ms = 3000): LongPressHandlers {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  function clear() {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  return {
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      fired.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, ms);
    },
    onPointerUp: () => {
      clear();
      if (fired.current) {
        window.setTimeout(() => {
          fired.current = false;
        }, 400);
      }
    },
    onPointerCancel: clear,
    onPointerLeave: clear,
    onClickCapture: (event) => {
      if (!fired.current) return;
      event.preventDefault();
      event.stopPropagation();
      fired.current = false;
    },
  };
}
