import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reimagine Your Job",
  description:
    "A 30-minute paired exercise: redesign your partner's job for the age of AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
