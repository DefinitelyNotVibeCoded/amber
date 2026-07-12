import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amber: OKF Vault",
  description: "An Obsidian-style app for browsing and editing Open Knowledge Format bundles.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
