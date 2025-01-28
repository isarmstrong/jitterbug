import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jitterbug Integration Tests",
  description: "Test environment for Jitterbug error handling",
  icons: []
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
