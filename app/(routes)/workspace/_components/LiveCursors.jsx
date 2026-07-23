"use client";
import React, { useEffect } from "react";
import { useOthers, useUpdateMyPresence } from "@liveblocks/react";

// Stable per-connection colours, so a peer keeps the same colour while present.
const CURSOR_COLORS = [
  "#E57373",
  "#64B5F6",
  "#81C784",
  "#FFB74D",
  "#BA68C8",
  "#4DB6AC",
];

/**
 * Renders other people's mouse cursors in the current room.
 *
 * Note: these are *pointer* cursors, not text carets. Showing another user's
 * caret inside the editor would require the document to live in a CRDT
 * (Liveblocks Storage / Yjs); today the content syncs through Firestore.
 */
function LiveCursors() {
  const others = useOthers();
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    // pointermove fires dozens of times a second. Coalesce to one update per
    // animation frame — pushing presence on every raw event made the page lag.
    let frame = null;
    let pending = null;

    const flush = () => {
      frame = null;
      if (pending) updateMyPresence({ cursor: pending });
    };

    const onPointerMove = (event) => {
      pending = { x: event.clientX, y: event.clientY };
      if (frame === null) frame = requestAnimationFrame(flush);
    };

    const onPointerLeave = () => {
      pending = null;
      updateMyPresence({ cursor: null });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [updateMyPresence]);

  return (
    <>
      {others.map(({ connectionId, presence, info }) => {
        const cursor = presence?.cursor;
        if (!cursor) return null;

        const color = CURSOR_COLORS[connectionId % CURSOR_COLORS.length];

        return (
          <div
            key={connectionId}
            className="pointer-events-none fixed left-0 top-0 z-50"
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={color}>
              <path d="M5 3l14 7-6 2-2 6z" />
            </svg>
            <span
              className="ml-3 whitespace-nowrap rounded px-1.5 py-0.5 text-xs text-white"
              style={{ backgroundColor: color }}
            >
              {info?.name ?? "Anonymous"}
            </span>
          </div>
        );
      })}
    </>
  );
}

export default LiveCursors;
