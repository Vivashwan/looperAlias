import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiEditText } from "@/config/GoogleAIModel";

const ALLOWED = ["improve", "summarize", "shorten", "lengthen"];

// Runs the inline "AI edit" actions server-side so GEMINI_API_KEY stays private.
export async function POST(req) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { text, action } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const result = await aiEditText(text, ALLOWED.includes(action) ? action : "improve");
    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI edit failed:", error);
    return NextResponse.json(
      { error: "Failed to edit text. Please try again." },
      { status: 500 }
    );
  }
}
