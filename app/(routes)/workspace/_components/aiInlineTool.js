import { toast } from "sonner";

/**
 * Builds an Editor.js *inline* tool (a button in the selection toolbar) that
 * sends the selected text to /api/ai-edit and replaces it with the result.
 *
 * Editor.js persists via input events on the contenteditable block, and a
 * programmatic Range mutation doesn't emit one — so after replacing the text we
 * dispatch a synthetic `input` event to make the editor save + record history.
 */
export function makeAiInlineTool({ action, title, label }) {
  return class AiInlineTool {
    static get isInline() {
      return true;
    }
    static get title() {
      return title;
    }
    // Sanitizer config: allow plain text replacement.
    static get sanitize() {
      return {};
    }

    constructor() {
      this.button = null;
    }

    render() {
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add("ce-inline-tool");
      button.innerHTML = label;
      button.title = title;
      return button;
    }

    surround(range) {
      if (!range) return;
      const text = range.toString();
      if (!text.trim()) return;

      // The toolbar closes (and the live selection is lost) as soon as this
      // returns, so capture the range now and apply the result later.
      const savedRange = range.cloneRange();
      const blockEl =
        savedRange.startContainer.parentElement?.closest(".ce-block") ??
        savedRange.startContainer.parentElement;

      const loadingToast = toast.loading("AI is editing…");

      fetch("/api/ai-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then(({ result }) => {
          if (!result) throw new Error("empty result");
          savedRange.deleteContents();
          savedRange.insertNode(document.createTextNode(result));
          // Make Editor.js notice the change so it saves + updates history.
          blockEl?.dispatchEvent(new Event("input", { bubbles: true }));
          toast.success("Updated", { id: loadingToast });
        })
        .catch((error) => {
          console.error("AI edit failed:", error);
          toast.error("Couldn't edit the text.", { id: loadingToast });
        });
    }

    // Not a stateful toggle (like bold), so it never shows as "active".
    checkState() {
      return false;
    }
  };
}
