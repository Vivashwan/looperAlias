// Helpers for reading Editor.js output ({ blocks: [...] }) as plain text and
// Markdown. Shared by the word-count indicator and the Markdown export.

const WORDS_PER_MINUTE = 200;

/** Strip HTML tags and decode the few entities Editor.js emits. */
function stripHtml(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Pull the human-readable text out of a single block, regardless of type. */
function blockToText(block) {
  const data = block?.data ?? {};
  switch (block?.type) {
    case "header":
    case "paragraph":
    case "quote":
      return stripHtml(data.text);
    case "alert":
      return stripHtml(data.message);
    case "code":
      return String(data.code ?? "");
    case "list":
      return (data.items ?? []).map((i) => stripHtml(i)).join(" ");
    case "checklist":
      return (data.items ?? []).map((i) => stripHtml(i?.text)).join(" ");
    case "table":
      return (data.content ?? [])
        .flat()
        .map((c) => stripHtml(c))
        .join(" ");
    default:
      return "";
  }
}

/** All block text joined into one plain string (for search / word count). */
export function toPlainText(output) {
  return (output?.blocks ?? []).map(blockToText).join(" ").replace(/\s+/g, " ").trim();
}

/** Total word count across all blocks. */
export function countWords(output) {
  const text = toPlainText(output);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/**
 * `documentOutput.output` is stored as a JSON string by SaveDocument, but new
 * docs start as an empty array. Normalize both into `{ blocks }`.
 */
export function parseStoredOutput(output) {
  if (typeof output === "string") {
    try {
      return JSON.parse(output);
    } catch {
      return { blocks: [] };
    }
  }
  if (Array.isArray(output)) return { blocks: output };
  return output ?? { blocks: [] };
}

/** Reading time in whole minutes (minimum 1 when there's any text). */
export function readingTimeMinutes(output) {
  const words = countWords(output);
  return words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Convert Editor.js output to a Markdown string. */
export function toMarkdown(output) {
  const blocks = output?.blocks ?? [];

  return blocks
    .map((block) => {
      const data = block?.data ?? {};
      switch (block?.type) {
        case "header":
          return `${"#".repeat(data.level || 2)} ${stripHtml(data.text)}`;
        case "paragraph":
          return stripHtml(data.text);
        case "quote":
          return `> ${stripHtml(data.text)}${
            data.caption ? `\n> — ${stripHtml(data.caption)}` : ""
          }`;
        case "alert":
          return `> **${(data.type || "note").toUpperCase()}:** ${stripHtml(
            data.message
          )}`;
        case "code":
          return "```\n" + (data.code ?? "") + "\n```";
        case "delimiter":
          return "---";
        case "list": {
          const ordered = data.style === "ordered";
          return (data.items ?? [])
            .map((item, i) => `${ordered ? `${i + 1}.` : "-"} ${stripHtml(item)}`)
            .join("\n");
        }
        case "checklist":
          return (data.items ?? [])
            .map((item) => `- [${item?.checked ? "x" : " "}] ${stripHtml(item?.text)}`)
            .join("\n");
        case "table":
          return (data.content ?? [])
            .map((row) => `| ${row.map((c) => stripHtml(c)).join(" | ")} |`)
            .join("\n");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
