import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School ERP",
  description: "Multi-tenant school ERP platform",
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
