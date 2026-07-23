"use client";
import React from "react";
import { useOthers } from "@liveblocks/react";

// Show at most this many avatars; the rest collapse into a "+N" badge.
const MAX_SHOWN = 4;

function Avatar({ name, avatar }) {
  const label = name;
  return (
    <div
      title={label}
      className="relative -ml-2 h-8 w-8 shrink-0 overflow-hidden rounded-full
        border-2 border-white bg-gray-200 first:ml-0"
    >
      {avatar ? (
        // Clerk avatars are served from img.clerk.com, which isn't in
        // next.config remotePatterns — a plain <img> avoids that coupling.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-medium">
          {name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

/**
 * The OTHER people currently in this document's room. `info` comes from the
 * Liveblocks token (see api/liveblocks-auth), so no extra lookup is needed.
 *
 * Deliberately excludes the current user: Clerk's <UserButton> sits right next
 * to this in the header and already represents them, so rendering self here
 * showed the same person twice.
 *
 * Uses the non-suspense hooks on purpose: the suspense variants would suspend
 * the surrounding boundary and block the document from rendering.
 */
function Avatars() {
  const others = useOthers();

  if (others.length === 0) return null;

  const visible = others.slice(0, MAX_SHOWN);
  const overflow = others.length - visible.length;

  return (
    <div className="flex items-center">
      {visible.map((other) => (
        <Avatar
          key={other.connectionId}
          name={other.info?.name ?? "Anonymous"}
          avatar={other.info?.avatar}
        />
      ))}

      {overflow > 0 && (
        <div
          title={`${overflow} more`}
          className="relative -ml-2 flex h-8 w-8 shrink-0 items-center justify-center
            rounded-full border-2 border-white bg-gray-300 text-xs font-medium"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default Avatars;
