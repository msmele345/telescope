import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import PromoteSavedObserver from "@/components/PromoteSavedObserver";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Telescope",
  description: "An interactive star map of the night sky.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SiteHeader session={session} />
        {children}
        <PromoteSavedObserver isAuthenticated={Boolean(session?.user?.id)} />
      </body>
    </html>
  );
}
