import { Button } from "@/components/ui/button";
import { LayoutGrid, Loader2Icon } from "lucide-react";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function GenerateAITemplate({ setGenerateAIOutput }) {
  const [open, setOpen] = useState(false); // Handles dialog state
  const [userInput, setUserInput] = useState();
  const [loading, setLoading] = useState(false);

  const GenerateFromAI = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userInput }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const { output } = await response.json();
      setGenerateAIOutput(output);
      setOpen(false); // Close dialog after generating the template
    } catch (e) {
      console.error("Failed to generate AI template:", e);
      toast.error("Couldn't generate the template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        className="flex gap-2"
        onClick={() => setOpen(true)} // Open dialog on button click
      >
        <LayoutGrid className="h-4 w-4" /> Generate AI template
      </Button>

      {/* Bind open state and add onOpenChange handler */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate template using AI</DialogTitle>
            {/* DialogDescription renders a <p>, so it must hold text only —
                block elements (input, div) inside it are invalid HTML and
                cause a hydration error. Keep them as siblings below. */}
            <DialogDescription>
              Describe the document you want and AI will draft it for you.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Ex. a weekly meeting notes template"
            onChange={(event) => setUserInput(event?.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && userInput && !loading) {
                GenerateFromAI();
              }
            }}
          />

          <div className="mt-2 flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={loading || !userInput} onClick={GenerateFromAI}>
              {loading ? <Loader2Icon className="animate-spin" /> : "Generate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GenerateAITemplate;
