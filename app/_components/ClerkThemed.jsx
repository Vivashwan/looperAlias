"use client";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

// Clerk components don't follow Tailwind's dark class — their text stayed black
// on a dark background. Feed them Clerk's own `dark` base theme when our theme
// is dark so the switcher/menu are legible (and their popovers match too).
function useClerkAppearance() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? { baseTheme: dark } : undefined;
}

export function ThemedOrganizationSwitcher(props) {
  return <OrganizationSwitcher {...props} appearance={useClerkAppearance()} />;
}

export function ThemedUserButton(props) {
  return <UserButton {...props} appearance={useClerkAppearance()} />;
}
