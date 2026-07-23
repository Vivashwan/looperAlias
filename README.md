# Looper Alias

A collaborative document workspace — think a lightweight Notion. Teams create
workspaces, write rich block-based documents together, comment and @mention each
other in real time, and generate or refine content with AI.

Built with **Next.js (App Router)**, **Clerk** (auth & organizations),
**Firebase Firestore** (data), **Liveblocks** (real-time comments, presence &
notifications), **Editor.js** (the document editor), and **Google Gemini** (AI
features).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works (the flow)](#how-it-works-the-flow)
- [Data model](#data-model)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API routes](#api-routes)
- [Security notes](#security-notes)
- [Known limitations & roadmap](#known-limitations--roadmap)

---

## Features

### Workspaces & documents
- **Organizations** — data is scoped to your active Clerk organization (or your
  personal account). You only see your org's workspaces.
- **Create workspaces** with a name, emoji, and cover image.
- **Rich documents** powered by Editor.js: headings, paragraphs, lists,
  checklists, tables, code blocks, quotes, callouts (alerts), dividers, images,
  and embeds (YouTube / Vimeo / Twitter / CodePen / GitHub). Inline formatting
  includes bold, italic, links, **highlight**, and `inline code`.
- **Auto-open** — opening a workspace jumps straight to its first document
  instead of a blank screen; empty workspaces show a "create your first
  document" prompt.
- **Rename / options menus** — every workspace and document has a `⋮` menu with
  **Rename**, **Share Link**, and **Delete**. Renaming a workspace lets you edit
  its name, emoji, and cover in one dialog.
- **Trash & restore** — deleting is a *soft* delete. Deleted items are
  recoverable via an **Undo** toast or the **Trash** bin (restore, or delete
  forever). The Trash button only appears when there's something in it.
- **Favorites & sorting** — star workspaces to pin them to the top; sort by
  Newest / Oldest / Name.
- **Tile & list views** on the dashboard.

### Editing
- **Autosave** to Firestore as you type.
- **Undo / redo** (Ctrl/Cmd+Z, Ctrl+Y / Ctrl/Cmd+Shift+Z) — a custom
  snapshot-based history that also handles paste.
- **Word count & reading time** shown under the editor.
- **Export to Markdown** — copies the document as clean Markdown.

### AI (Google Gemini)
- **Generate AI template** — describe a document ("weekly meeting notes with an
  agenda and action items") and AI drafts it, inserting blocks **at your
  cursor** (it doesn't wipe existing content). Constrained to the editor's
  supported block types.
- **Inline AI editing** — select text and use the toolbar to **✨ Improve**
  (rewrite for grammar/clarity) or **∑ Summarize** the selection in place.

### Collaboration (Liveblocks)
- **Comments** on documents, with **@mentions** scoped to your organization's
  members.
- **Presence** — avatars of others viewing a document, plus their **live
  cursors**.
- **Notifications** — an inbox bell for comment activity, showing document names
  (not raw IDs).

### UX
- **Dark mode** — system-aware with a manual toggle; persists across sessions.
- **Global search** (⌘K / Ctrl+K) across document **titles and content**, with
  matching snippets.
- **Responsive** — the sidebar becomes a slide-over drawer on mobile.
- **Loading skeletons** and toasts throughout.

---

## Tech stack

| Concern | Tool |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Auth & orgs | Clerk (`@clerk/nextjs`) |
| Database | Firebase Firestore |
| Real-time (comments, presence, notifications) | Liveblocks |
| Document editor | Editor.js + plugins |
| AI | Google Gemini (`@google/generative-ai`, `gemini-2.5-flash`) |
| UI | Tailwind CSS, Radix UI, shadcn-style components, lucide-react icons |
| Toasts | sonner |
| Theming | next-themes |

---

## How it works (the flow)

```
Landing (/)                     → marketing hero, "Get started" → /dashboard
   │
   ▼  (Clerk middleware protects /dashboard and /workspace)
Sign in / Sign up               → /sign-in, /sign-up (Clerk)
   │
   ▼
Dashboard (/dashboard)
   • Header: logo · organization switcher · theme toggle · account
   • "Hello, <name>" · search (⌘K) · "+ new workspace"
   • Trash · sort · grid/list toggle
   • Workspace cards (favorite ★, ⋮ options)
   │
   ├─ "+ New Workspace" → /createworkspace (name + emoji + cover) → creates a
   │                       workspace AND its first document, then opens it
   │
   ▼  click a workspace card
Workspace (/workspace/[workspaceid])
   • Auto-redirects to the first document, or shows the empty state
   │
   ▼
Document (/workspace/[workspaceid]/[documentid])
   • Left: SideNav — workspace name, document list, notification bell
   • Top: cover image, emoji, title, collaborator avatars, theme toggle
   • Center: Editor.js document (autosaves to Firestore)
   • Bottom: "Generate AI template" · "Export" · word count
   • Right: comment button → comment panel (threads + @mentions)
   • Overlay: other users' live cursors
```

**Under the hood:**

1. **Auth** — Clerk gates `/dashboard` and `/workspace` via `middleware.js`.
   Signed-in users' basic info is mirrored into the `LooperAliasUsers`
   collection so mentions can resolve names/avatars.
2. **Data** — workspaces, document metadata, and document content live in
   Firestore. The browser reads/writes Firestore directly and subscribes with
   `onSnapshot` for live updates (e.g. the sidebar document list).
3. **Editor** — Editor.js is loaded client-only (`dynamic(..., { ssr: false })`)
   because its plugins touch browser globals. Content is saved as JSON in the
   `documentOutput` collection.
4. **AI** — all Gemini calls run in **server API routes** so the API key never
   reaches the browser. The client calls `/api/generate-template` and
   `/api/ai-edit`.
5. **Real-time** — each document is a Liveblocks "room". The client authorizes
   against `/api/liveblocks-auth`, which verifies the room belongs to a
   workspace the user's org owns before granting access.

---

## Data model

Firestore collections:

| Collection | Key | Fields |
| --- | --- | --- |
| `Workspace` | `<timestamp>` | `workspaceName`, `emoji`, `coverImage`, `createdBy`, `orgId`, `favorite?`, `deletedAt?` |
| `workspaceDocuments` | `<uuid>` | `documentName`, `emoji`, `coverImage`, `workspaceId`, `createdBy`, `deletedAt?` |
| `documentOutput` | `<document uuid>` | `docId`, `output` (Editor.js JSON, stringified), `editedBy` |
| `LooperAliasUsers` | `<email>` | `name`, `email`, `avatar` |

Notes:
- `orgId` is the active Clerk organization id, or the creator's email for
  personal accounts. This is the ownership/authorization key.
- **Soft delete** is a `deletedAt` timestamp. Listings filter these out
  client-side (so documents created before the feature, which have no field,
  still appear).
- A document's *content* (`documentOutput`) is separate from its *metadata*
  (`workspaceDocuments`); deletes cascade across both.

---

## Project structure

```
app/
  layout.js                      # Root: Clerk + Theme + Firebase auth bridge
  page.js                        # Landing page
  Room.jsx                       # Liveblocks provider (auth, mentions, presence)

  (auth)/                        # Clerk sign-in / sign-up
  (routes)/
    createworkspace/             # New-workspace form
    dashboard/
      _components/                 Header, WorkspaceList, WorkspaceItemList,
                                   WorkspaceOptions, SearchDocuments, TrashDialog
    workspace/
      [workspaceid]/               Workspace (SideNav + empty state)
      [workspaceid]/[documentid]/  Document editor page
      _components/                 SideNav, DocumentEditorSection, RichDocumentEditor,
                                   DocumentInfo, DocumentHeader, DocumentList,
                                   DocumentOptions, CommentBox, Avatars, LiveCursors,
                                   NotificationBox, GenerateAITemplate, aiInlineTool,
                                   EmptyDocumentState
  api/
    generate-template/route.js   # AI: draft a document template
    ai-edit/route.js             # AI: improve/summarize selected text
    liveblocks-auth/route.js     # Authorizes Liveblocks rooms

  _components/                   # Shared: ThemeProvider, ThemeToggle,
                                 # FirebaseAuthBridge, CoverPicker, EmojiPicker, etc.

config/
  firebaseConfig.js              # Firestore init
  GoogleAIModel.jsx              # Gemini models + prompts (server-only)
lib/
  firestoreActions.js            # create / soft-delete / restore / cascade delete
  editorContent.js               # word count, plain text, Markdown export
  utils.js                       # cn() helper
middleware.js                    # Clerk route protection
firestore.rules                  # Security rules (see below — deploy after setup)
```

---

## Getting started

**Prerequisites:** Node 18+, and accounts for Clerk, Firebase, Liveblocks, and
Google AI Studio (Gemini).

```bash
# 1. Install dependencies
npm install

# 2. Create .env (see below) with your own keys

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run lint`.

---

## Environment variables

Create a `.env` file in the project root:

```bash
# Clerk (dashboard → API keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Firebase (project settings → web app config)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...

# Liveblocks (dashboard → API keys)
LIVEBLOCK_SK=sk_...
LIVEBLOCK_PK=pk_...

# Google Gemini (Google AI Studio → API keys) — server-only, NOT NEXT_PUBLIC
GEMINI_API_KEY=...
```

> ⚠️ **Do not commit `.env`.** It contains live secrets — add it to
> `.gitignore`. `GEMINI_API_KEY` is intentionally **not** prefixed with
> `NEXT_PUBLIC_` so it stays on the server. The rest of the Firebase config
> (project id, etc.) is set in `config/firebaseConfig.js`.

---

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/generate-template` | POST | Generate an Editor.js document from a prompt (Gemini). Auth required. |
| `/api/ai-edit` | POST | Improve/summarize a text selection (Gemini). Auth required. |
| `/api/liveblocks-auth` | POST | Authorize a Liveblocks room; checks the room belongs to the user's org. |

All three verify the Clerk session server-side.

---

## Security notes

- **AI key safety** — Gemini runs only in server routes; the key is never sent
  to the browser.
- **Room authorization** — `/api/liveblocks-auth` grants access only to rooms
  belonging to a workspace the caller's organization owns.
- **Firestore rules** — `firestore.rules` contains a complete ruleset that
  restricts each user to their own org's/personal data. **It is not yet active.**
  It requires bridging Clerk → Firebase Authentication (custom tokens); the code
  for this lives in `app/_components/FirebaseAuthBridge.jsx`, and the file header
  of `firestore.rules` documents the exact Clerk + Firebase dashboard setup.
  **Until that bridge is live and the rules are deployed, Firestore is open** —
  do this before any public/production use.

---

## Known limitations & roadmap

- **Real-time co-editing** — comments, presence, and live cursors are real-time,
  but the *document text itself* syncs through Firestore with last-write-wins.
  Two people editing the same document at once can overwrite each other. True
  conflict-free co-editing would require moving content to a CRDT (Yjs /
  Liveblocks Storage), which effectively means swapping Editor.js for a
  Yjs-native editor (TipTap / Lexical). Planned, not yet built.
- **Content search** is done client-side (fetches document bodies and searches
  in the browser). Great at this scale; a large document count would want a
  search service (Algolia / Typesense).
- **Firestore rules** are written but must be activated (see Security notes).
