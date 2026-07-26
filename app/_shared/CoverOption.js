// High-res background photos are served from Unsplash's CDN (hotlink-friendly
// under the Unsplash license). Request a full-width, quality-capped, auto-format
// crop so covers look sharp as full-width banners without shipping huge files.
const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?w=1920&q=80&auto=format&fit=crop`;

/**
 * Covers saved before this change may point at the old low-res (~626px) Freepik
 * preview. Rewrite any stored Freepik URL to the high-res variant at render
 * time, dropping stale tracking/signature params. Other URLs (local defaults,
 * Unsplash, /covers/*.mp4, user-pasted) pass through untouched.
 */
export function highResCover(url) {
  if (!url || !url.includes("img.freepik.com")) return url;
  return `${url.split("?")[0]}?w=1920`;
}

/**
 * A cover is stored as a plain URL string. Detect how to render it from the
 * file extension: looping <video> for clips, animated <img> for GIFs (Next's
 * <Image> optimisation strips GIF animation), and <Image> for stills.
 */
export function coverType(url = "") {
  const path = String(url).split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogv)$/.test(path)) return "video";
  if (/\.gif$/.test(path)) return "gif";
  return "image";
}

export default [
  // Animated covers (self-hosted in /public/covers so they can't rot or be
  // CORS-blocked). Users can also paste their own GIF/video URL in the picker.
  // Pixabay aerial / nature drone loops (transcoded to 720p for the web).
  { imageUrl: "/covers/16214646.mp4" },
  { imageUrl: "/covers/343478.mp4" },
  { imageUrl: "/covers/345377.mp4" },
  { imageUrl: "/covers/346395.mp4" },
  { imageUrl: "/covers/348116.mp4" },
  // Nature / video clips.
  { imageUrl: "/covers/jellyfish.mp4" },
  { imageUrl: "/covers/flower.mp4" },
  { imageUrl: "/covers/bunny.mp4" },

  // High-resolution background photos (Unsplash) — replaces the old low-res
  // Freepik set.
  { imageUrl: UNSPLASH("1506744038136-46273834b3fb") }, // Yosemite valley, misty
  { imageUrl: UNSPLASH("1470071459604-3b5ec3a7fe05") }, // green hills at sunrise
  { imageUrl: UNSPLASH("1500534623283-312aade485b7") }, // sunset over mountains
  { imageUrl: UNSPLASH("1441974231531-c6227db76b6e") }, // sunlit forest path
  { imageUrl: UNSPLASH("1501785888041-af3ef285b470") }, // turquoise alpine lake
  { imageUrl: UNSPLASH("1519681393784-d120267933ba") }, // starry sky over peaks
  { imageUrl: UNSPLASH("1465146344425-f00d5f5c8f07") }, // poppy wildflower field
  { imageUrl: UNSPLASH("1493246507139-91e8fad9978e") }, // Moraine Lake reflection
  { imageUrl: UNSPLASH("1451187580459-43490279c0fa") }, // Earth from space at night
  { imageUrl: UNSPLASH("1462331940025-496dfbfc7564") }, // nebula in deep space
  { imageUrl: UNSPLASH("1419242902214-272b3f66ee7a") }, // purple starry horizon
  { imageUrl: UNSPLASH("1541701494587-cb58502866ab") }, // colorful ink in water
  { imageUrl: UNSPLASH("1517685352821-92cf88aee5a5") }, // soft clouds / sky
  { imageUrl: UNSPLASH("1524169358666-79f22534bc6e") }, // red geometric 3D shapes
];
