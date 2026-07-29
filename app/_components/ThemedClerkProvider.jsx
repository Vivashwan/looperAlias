"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

// Themes ALL Clerk surfaces from one place — SignIn, SignUp, UserButton, the
// Manage Account modal, and the OrganizationSwitcher — by feeding Clerk's own
// `dark` base theme to the provider whenever our app theme is dark. This
// replaces per-component appearance props, which only covered the header
// widgets and left the auth pages / account modal in Clerk's light theme.
export function ThemedClerkProvider({ children }) {
  const { resolvedTheme } = useTheme();
  return (
    <ClerkProvider
      appearance={resolvedTheme === "dark" ? { baseTheme: dark } : undefined}
    >
      {children}
    </ClerkProvider>
  );
}
