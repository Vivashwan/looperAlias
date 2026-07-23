/*
 * Server-only Gemini helper.
 *
 * IMPORTANT: This module reads GEMINI_API_KEY (NOT prefixed with NEXT_PUBLIC_),
 * so it must only ever be imported from server code (e.g. app/api routes).
 * Importing it from a client component would leak the key into the browser
 * bundle.
 *
 * $ npm install @google/generative-ai
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// The editor only registers a fixed set of block tools. Without this, the model
// invents block types that don't exist (form-input, star-rating, warning, …),
// which the editor then skips — and generating dozens of them can truncate the
// JSON and break parsing. Constrain the model to exactly what we support.
const SYSTEM_INSTRUCTION = `You produce content for the Editor.js block editor.

Return ONLY a JSON object shaped like: { "blocks": [ ... ] }
No commentary, no markdown code fences.

You may ONLY use these block "type" values, with exactly these "data" shapes:
- "header":    { "text": string, "level": 1 | 2 | 3 | 4 }
- "paragraph": { "text": string }
- "list":      { "style": "ordered" | "unordered", "items": string[] }
- "checklist": { "items": [ { "text": string, "checked": boolean } ] }
- "quote":     { "text": string, "caption": string, "alignment": "left" }
- "table":     { "withHeadings": boolean, "content": string[][] }
- "code":      { "code": string }
- "delimiter": {}
- "alert":     { "type": "primary"|"secondary"|"info"|"success"|"warning"|"danger", "align": "left", "message": string }

Never use any other type (no forms, inputs, buttons, ratings, images, embeds).
If the user asks for something unsupported, express it with the blocks above
(e.g. represent a form as a checklist or a table). Keep the document focused so
the JSON is always complete and valid. "text" fields may contain simple inline
HTML (<b>, <i>, <a>, <mark>) but never other block types.`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_INSTRUCTION,
});

// Separate model for inline text editing: returns plain prose (no JSON), so it
// must NOT share the template model's application/json response type.
const editModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction:
    "You are a writing assistant embedded in a document editor. You receive a " +
    "snippet of text and an instruction. Return ONLY the edited text — no " +
    "quotes, no preamble, no markdown fences, no commentary. Keep the original " +
    "language.",
});

const EDIT_ACTIONS = {
  improve: "Improve the writing: fix grammar, clarity and flow. Keep the meaning and roughly the same length.",
  summarize: "Summarize the following text concisely.",
  shorten: "Rewrite the following text to be shorter and more concise.",
  lengthen: "Expand the following text with more detail and explanation.",
};

/** Transforms a snippet of text with one of the EDIT_ACTIONS. Returns plain text. */
export async function aiEditText(text, action = "improve") {
  const instruction = EDIT_ACTIONS[action] ?? EDIT_ACTIONS.improve;
  const result = await editModel.generateContent(
    `${instruction}\n\nText:\n"""\n${text}\n"""`
  );
  return (result?.response?.text() ?? "").trim();
}

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// One clean example, matching the exact output contract (no fences, no prose).
// The previous example wrapped JSON in ```json fences and appended commentary,
// which taught the model to do the same and broke parsing.
const history = [
  {
    role: "user",
    parts: [{ text: "a grocery shopping list" }],
  },
  {
    role: "model",
    parts: [
      {
        text: '{"blocks":[{"type":"header","data":{"text":"Grocery List","level":1}},{"type":"list","data":{"style":"unordered","items":["Milk","Eggs","Bread","Apples"]}}]}',
      },
    ],
  },
];

/**
 * Generates an Editor.js template (as a parsed JSON object) from a user prompt.
 * Runs a fresh chat session per call so requests don't share/accumulate state.
 * Always resolves to an object with a `blocks` array, or throws a clear error.
 */
export async function generateTemplate(userInput) {
  const chatSession = model.startChat({ generationConfig, history });
  const result = await chatSession.sendMessage(
    "Generate an Editor.js template for: " + userInput
  );

  let text = (result?.response?.text() ?? "").trim();

  // Defensive: strip ```json fences if the model adds them despite the
  // application/json response type.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    // Usually means the response was truncated (hit the output-token limit).
    console.error("AI returned unparseable output:", text.slice(0, 300));
    throw new Error("AI returned malformed JSON");
  }

  // Accept either { blocks: [...] } or a bare [...] array.
  const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
  if (!Array.isArray(blocks)) {
    throw new Error("AI response had no blocks array");
  }

  return { blocks };
}
