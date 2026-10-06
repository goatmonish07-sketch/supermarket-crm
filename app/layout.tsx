import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "AuraPOS", template: "%s · AuraPOS" },
  description: "Billing, stock, orders and reports for boutiques.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies "system" dark mode before paint to avoid a light flash.
const modeScript = `(function(){var d=document.documentElement;if(d.dataset.mode==="SYSTEM"&&matchMedia("(prefers-color-scheme: dark)").matches)d.classList.add("dark")})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const theme = user?.theme ?? "emerald";
  const mode = user?.themeMode ?? "SYSTEM";

  return (
    <html lang="en" data-theme={theme} data-mode={mode} className={mode === "DARK" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
