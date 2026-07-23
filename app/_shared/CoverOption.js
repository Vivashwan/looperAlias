// Freepik's image CDN serves a low-res ~626px preview unless a `w` param is
// given. Covers are displayed as full-width banners, so request 1920px.
const FREEPIK = (path) => `https://img.freepik.com/${path}?w=1920`;

/**
 * Covers saved before this change point at the low-res (~626px) Freepik
 * preview. Rewrite any stored Freepik URL to the high-res variant at render
 * time, dropping stale tracking/signature params. Non-Freepik URLs (e.g. the
 * local /cover.png default) pass through untouched.
 */
export function highResCover(url) {
  if (!url || !url.includes("img.freepik.com")) return url;
  return `${url.split("?")[0]}?w=1920`;
}

export default [
  {
    imageUrl: FREEPIK(
      "free-photo/colorful-wave-is-water-word-wave-is-bottom-right_1340-35420.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/abstract-flame-shapes-flowing-vibrant-blue-yellow-colors-generated-by-artificial-intelligence_188544-84559.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/smooth-waves-vibrant-colors-flow-abstractly-generated-by-ai_188544-9810.jpg"
    ),
  },
  {
    imageUrl: FREEPIK("free-vector/gradient-geometric-wallpaper_52683-55729.jpg"),
  },
  {
    imageUrl: FREEPIK(
      "free-vector/abstract-colorful-technology-dotted-wave-background_1035-17450.jpg"
    ),
  },
  {
    imageUrl: FREEPIK("free-photo/geometric-seamless-pattern_23-2151021459.jpg"),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/vibrant-colors-flow-abstract-wave-pattern-generated-by-ai_188544-9781.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/abstract-psychedelic-papercut-background_23-2149303027.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-vector/geometric-wallpaper-japanese-style_52683-34401.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/photorealistic-galaxy-background_23-2151064385.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/glowing-spaceship-orbits-sphere-deep-space-generated-by-ai_188544-9658.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/colorful-splash-paint-white-background_1409-5118.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/minimalist-colorful-3d-lines-background_1409-4965.jpg"
    ),
  },
  {
    imageUrl: FREEPIK(
      "free-photo/seamless-abstract-pattern-design_23-2151179146.jpg"
    ),
  },
];
