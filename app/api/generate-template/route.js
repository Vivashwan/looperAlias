import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateTemplate } from "@/config/GoogleAIModel";

// Gemini calls run here, on the server, so GEMINI_API_KEY never reaches the browser.
export async function POST(req) {
  try {
    // The Clerk middleware only protects /dashboard and /workspace, so this
    // route must check auth itself — otherwise anyone can burn the Gemini quota.
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A 'prompt' string is required." },
        { status: 400 }
      );
    }

    const output = await generateTemplate(prompt);
    return NextResponse.json({ output });
  } catch (error) {
    console.error("AI template generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate template. Please try again." },
      { status: 500 }
    );
  }
}
