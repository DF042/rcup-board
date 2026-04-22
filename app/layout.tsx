import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "RCUP Board",
  description: "Yahoo fantasy sports analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
  try {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = storedTheme ? storedTheme === "dark" : prefersDark;
    root.classList.toggle("dark", isDark);
  } catch {
    // Ignore environments where storage/media APIs are unavailable or blocked.
  }
})();`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
