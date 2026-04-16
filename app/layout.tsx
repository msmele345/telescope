import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telescope",
  description: "An interactive star map of the night sky.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
