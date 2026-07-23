"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

// Adds the `class="dark"` toggle next-themes needs. Tailwind is already set to
// darkMode: ["class"], and globals.css defines .dark token overrides, so the
// base UI (background, text, borders) flips automatically once this is mounted.
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
