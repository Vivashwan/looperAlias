import React, { useEffect, useRef, useState } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Delimiter from "@editorjs/delimiter";
import Alert from "editorjs-alert";
import List from "@editorjs/list";
import Checklist from "@editorjs/checklist";
import SimpleImage from "simple-image-editorjs";
import Table from "@editorjs/table";
import CodeTool from "@editorjs/code";
import Quote from "@editorjs/quote";
import Embed from "@editorjs/embed";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { useUser } from "@clerk/nextjs";
import Paragraph from "@editorjs/paragraph";
import GenerateAITemplate from "./GenerateAITemplate";
import { countWords, readingTimeMinutes, toMarkdown } from "@/lib/editorContent";
import { downloadDocumentPdf } from "@/lib/exportPdf";
import { makeAiInlineTool } from "./aiInlineTool";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Clipboard } from "lucide-react";
import { toast } from "sonner";

// How many snapshots of undo history to keep per document.
const HISTORY_LIMIT = 100;

// Block types the editor has tools registered for. Saved content that contains
// any other type (e.g. an AI-generated block from before a tool existed) would
// otherwise crash EditorJS's render with "can't access property 'name'".
const REGISTERED_BLOCK_TYPES = new Set([
  "paragraph",
  "header",
  "list",
  "checklist",
  "table",
  "code",
  "quote",
  "alert",
  "delimiter",
  "image",
  "embed",
]);

/** Drop any blocks whose type has no registered tool, so render can't crash. */
function safeBlocks(output) {
  const blocks = (output?.blocks ?? []).filter((block) => {
    const ok = REGISTERED_BLOCK_TYPES.has(block?.type);
    if (!ok) console.warn(`Dropping unknown saved block type "${block?.type}"`);
    return ok;
  });
  return { ...output, blocks };
}

function RichDocumentEditor({ params }) {
  const editorRef = useRef(null);
  const { user } = useUser();
  const isFetched = useRef(false);
  // Holds the Firestore onSnapshot unsubscribe so we can stop it on unmount and
  // avoid a late snapshot rendering into a torn-down editor.
  const unsubscribeRef = useRef(null);
  const [stats, setStats] = useState({ words: 0, minutes: 0 });

  const updateStats = (output) => {
    setStats({
      words: countWords(output),
      minutes: readingTimeMinutes(output),
    });
  };

  // A simple, self-contained undo/redo history. EditorJS ships none, and the
  // `editorjs-undo` plugin crashed on this app's programmatic re-renders. This
  // just snapshots the saved output and re-renders an older one on Ctrl+Z — it
  // never touches the browser text selection, so it can't hit the crashes that
  // library did. Trade-off: the caret jumps rather than being restored.
  const historyRef = useRef([]); // array of saved outputs, oldest → newest
  const historyPosRef = useRef(-1); // index into historyRef we're currently at

  const recordHistory = (output) => {
    if (!output?.blocks) return;
    const history = historyRef.current;
    const current = history[historyPosRef.current];
    // Ignore no-op saves — including the echo from an undo/redo re-render.
    if (current && JSON.stringify(current.blocks) === JSON.stringify(output.blocks)) {
      return;
    }
    // A new edit after undoing discards the redo branch.
    history.splice(historyPosRef.current + 1);
    history.push(output);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyPosRef.current = history.length - 1;
  };

  const restoreHistory = async (position) => {
    const snapshot = historyRef.current[position];
    if (!snapshot || !editorRef.current) return;
    historyPosRef.current = position;
    await editorRef.current.render(snapshot);
    // render() rebuilds the DOM and drops focus. Put the cursor back so the
    // keydown listener (which lives on the editor) keeps receiving keys and
    // consecutive Ctrl+Z presses work without clicking back in.
    try {
      editorRef.current.caret.setToLastBlock("end");
    } catch {
      editorRef.current.focus(true);
    }
    // Persist the undone/redone state so it survives reload and reaches others.
    SaveDocument(snapshot);
  };

  const handleUndo = () => {
    if (historyPosRef.current > 0) restoreHistory(historyPosRef.current - 1);
  };

  const handleRedo = () => {
    if (historyPosRef.current < historyRef.current.length - 1) {
      restoreHistory(historyPosRef.current + 1);
    }
  };

  useEffect(() => {
    if (!user) return;
    InitEditor();
    // On unmount (navigating between documents, Fast Refresh) stop the
    // Firestore listener and tear down the editor, so a late snapshot can't
    // call render() on a removed editor instance (which throws internally).
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      const editor = editorRef.current;
      editorRef.current = null;
      isFetched.current = false;
      if (editor) {
        Promise.resolve(editor.isReady)
          .then(() => editor.destroy?.())
          .catch(() => {});
      }
    };
  }, [user]);

  // Ctrl/Cmd+Z to undo, Ctrl+Y or Ctrl/Cmd+Shift+Z to redo, scoped to the editor.
  useEffect(() => {
    const holder = document.getElementById("editorjs");
    if (!holder) return;

    const onKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        handleRedo();
      }
    };

    holder.addEventListener("keydown", onKeyDown);
    return () => holder.removeEventListener("keydown", onKeyDown);
    // Re-bind once `user` loads so the save inside undo/redo isn't a no-op from
    // a stale (null-user) closure captured at first render.
  }, [user]);

  const SaveDocument = async (outputData) => {
    if (!user) return;

    const docRef = doc(db, "documentOutput", params?.documentid);

    try {
      await updateDoc(docRef, {
        output: JSON.stringify(outputData),
        editedBy: user.primaryEmailAddress?.emailAddress,
      });
      console.log("Document saved successfully");
    } catch (error) {
      console.error("Error saving document:", error);
    }
  };

  const GetDocumentOutput = () => {
    const unsubscribe = onSnapshot(
      doc(db, "documentOutput", params?.documentid),
      (snapshot) => {
        const data = snapshot.data();
        if (
          data?.editedBy !== user?.primaryEmailAddress?.emailAddress ||
          !isFetched.current
        ) {
          if (data?.editedBy && data?.output) {
            const parsed = safeBlocks(JSON.parse(data.output));
            const editor = editorRef.current;
            if (editor) {
              // Wait for the editor to finish initialising, then re-check it's
              // still the current, live instance before rendering. render()
              // does async DOM work internally, so calling it on an editor that
              // was torn down (unmount / navigation) while we awaited isReady
              // throws detached from this chain ("can't access property
              // querySelector"). Bailing avoids that entirely.
              Promise.resolve(editor.isReady)
                .then(() => {
                  if (editorRef.current !== editor) return;
                  return editor.render(parsed);
                })
                .then(() => {
                  if (editorRef.current !== editor) return;
                  // Seed history with the loaded content so the first Ctrl+Z
                  // has a baseline instead of an empty editor.
                  if (historyRef.current.length === 0) recordHistory(parsed);
                  updateStats(parsed);
                })
                .catch((err) => console.warn("Skipped editor render:", err));
            }
          }
          isFetched.current = true;
        }
      }
    );
    return unsubscribe;
  };

  const InitEditor = () => {
    if (!editorRef.current) {
      const editor = new EditorJS({
        onChange: () => {
          editor.save().then((outputData) => {
            SaveDocument(outputData);
            recordHistory(outputData);
            updateStats(outputData);
          });
        },
        onReady: () => {
          // Keep the unsubscribe so the unmount cleanup can stop this listener.
          unsubscribeRef.current = GetDocumentOutput();
        },
        holder: "editorjs",
        tools: {
          header: Header,
          delimiter: Delimiter,
          paragraph: {
            class: Paragraph,
            inlineToolbar: true,
            // By default the paragraph tool's validate() rejects empty blocks,
            // so blank lines get dropped on reload with "skipped because saved
            // data is invalid". Keep them.
            config: { preserveBlank: true },
          },
          alert: {
            class: Alert,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+A",
            config: {
              alertTypes: [
                "primary",
                "secondary",
                "info",
                "success",
                "warning",
                "danger",
                "light",
                "dark",
              ],
              defaultType: "primary",
              messagePlaceholder: "Enter something",
            },
          },
          table: Table,
          list: {
            class: List,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
            config: {
              defaultStyle: "unordered",
            },
          },
          checklist: {
            class: Checklist,
            shortcut: "CMD+SHIFT+C",
            inlineToolbar: true,
          },
          image: SimpleImage,
          code: {
            class: CodeTool,
            shortcut: "CMD+SHIFT+P",
          },
          // Block tools
          quote: {
            class: Quote,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+O",
            config: {
              quotePlaceholder: "Enter a quote",
              captionPlaceholder: "Quote's author",
            },
          },
          embed: {
            class: Embed,
            config: {
              services: {
                youtube: true,
                vimeo: true,
                twitter: true,
                codepen: true,
                github: true,
              },
            },
          },
          // Inline tools — these appear in the toolbar when you select text,
          // rather than adding a new block.
          marker: {
            class: Marker,
            shortcut: "CMD+SHIFT+H",
          },
          inlineCode: {
            class: InlineCode,
            shortcut: "CMD+SHIFT+I",
          },
          // Inline AI: select text, then use these toolbar buttons to rewrite
          // or summarize the selection via Gemini (see aiInlineTool.js).
          aiImprove: {
            class: makeAiInlineTool({
              action: "improve",
              title: "AI: Improve writing",
              label: "✨",
            }),
          },
          aiSummarize: {
            class: makeAiInlineTool({
              action: "summarize",
              title: "AI: Summarize",
              label: "∑",
            }),
          },
        },
      });
      editorRef.current = editor;
    }
  };

  const handleGenerateAITemplate = async (output) => {
    const editor = editorRef.current;
    if (!editor) return;

    const blocks = output?.blocks ?? [];
    if (!blocks.length) return;

    // Insert the template at the cursor instead of re-rendering (which would
    // wipe the existing document).
    const total = editor.blocks.getBlocksCount();
    let index = editor.blocks.getCurrentBlockIndex();
    if (index < 0 || index >= total) index = total - 1;

    // If the cursor sits on an empty block, overwrite it so the template
    // doesn't leave a stray blank line above itself.
    let replaceCurrent = Boolean(editor.blocks.getBlockByIndex(index)?.isEmpty);
    let insertAt = replaceCurrent ? index : index + 1;
    let inserted = 0;

    for (const block of blocks) {
      try {
        editor.blocks.insert(
          block.type,
          block.data,
          {},
          insertAt,
          false,
          replaceCurrent
        );
      } catch (error) {
        // The model can emit a block type this editor has no tool for.
        console.warn(`Skipping unsupported block type "${block.type}"`, error);
        continue;
      }
      replaceCurrent = false;
      insertAt += 1;
      inserted += 1;
    }

    if (!inserted) return;

    editor.caret.setToBlock(insertAt - 1, "end");

    // Save the updated content
    const savedData = await editor.save();
    await SaveDocument(savedData);
    recordHistory(savedData);
    updateStats(savedData);
  };

  const handleExportPdf = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const output = await editor.save();
      // The document's title lives in workspaceDocuments, not in the editor.
      const snap = await getDoc(doc(db, "workspaceDocuments", params?.documentid));
      const title = snap.exists()
        ? snap.data().documentName || "Untitled Document"
        : "Document";
      await downloadDocumentPdf(output, title);
      toast.success("Downloaded PDF");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Couldn't export the document.");
    }
  };

  const handleCopyMarkdown = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const output = await editor.save();
      await navigator.clipboard.writeText(toMarkdown(output));
      toast.success("Copied as Markdown, ready to paste into Notion.");
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Couldn't copy the document.");
    }
  };

  return (
    <div className="px-4 md:ml-10 md:pl-20 md:pr-20">
      <div id="editorjs" className="w-full"></div>

      {/* Word count + reading time */}
      <div className="mt-6 text-xs text-gray-400">
        {stats.words} {stats.words === 1 ? "word" : "words"}
        {stats.minutes > 0 && ` · ${stats.minutes} min read`}
      </div>

      <div className="editor-float-actions fixed bottom-10 left-4 md:left-0 md:ml-80 z-10 flex gap-2">
        <GenerateAITemplate setGenerateAIOutput={handleGenerateAITemplate} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          {/* Opens upward — the trigger sits near the bottom of the screen. */}
          <DropdownMenuContent side="top" align="start">
            <DropdownMenuItem onClick={handleExportPdf}>
              <FileText className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyMarkdown}>
              <Clipboard className="mr-2 h-4 w-4" /> Copy as Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default RichDocumentEditor;