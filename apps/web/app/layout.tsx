import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muvi",
  description: "Your AI movie companion",
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
