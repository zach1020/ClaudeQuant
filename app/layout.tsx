import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "QuantDash — AI Day Trading",
  description: "Real-time AI-assisted day trading dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text">
        <Navigation />
        <main className="pt-12 h-screen overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
