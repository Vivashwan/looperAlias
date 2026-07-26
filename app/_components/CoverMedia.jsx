"use client";

import Image from "next/image";
import { coverType, highResCover } from "@/app/_shared/CoverOption";

/**
 * Renders a document cover from a URL, choosing the right element by type:
 *   - video (.mp4/.webm/...) -> muted, looping, autoplaying <video>
 *   - gif                    -> plain <img> (Next <Image> strips GIF animation)
 *   - image                  -> optimised next/image
 *
 * `fill` mimics next/image's fill layout (absolutely fills the parent, which
 * must be `position: relative`). Otherwise pass `width`/`height`.
 */
function CoverMedia({
  src,
  alt = "Cover",
  fill = false,
  width,
  height,
  priority = false,
  className = "",
}) {
  if (!src) return null;

  const type = coverType(src);
  const fillClasses = "absolute inset-0 h-full w-full object-cover";

  if (type === "video") {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        // `muted` is required for browsers to allow autoplay.
        className={`${fill ? fillClasses : className} ${fill ? className : ""}`.trim()}
      />
    );
  }

  // next/image only allows local paths and hosts listed in next.config. Our
  // curated covers (Unsplash + freepik + local /covers, /cover.png) qualify and
  // get optimised; a user-pasted image from any other domain would throw, so
  // fall back to a plain <img> for those.
  const optimisable =
    src.startsWith("/") ||
    src.includes("images.unsplash.com") ||
    src.includes("img.freepik.com");

  if (type === "gif" || !optimisable) {
    // Plain <img>: preserves GIF animation and works for any image host.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={`${fill ? fillClasses : className} ${fill ? className : ""}`.trim()}
      />
    );
  }

  // Static image from a known host -> optimised next/image.
  if (fill) {
    return (
      <Image
        src={highResCover(src)}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className={`object-cover ${className}`.trim()}
      />
    );
  }
  return (
    <Image
      src={highResCover(src)}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}

export default CoverMedia;
