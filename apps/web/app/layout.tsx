import type { Metadata } from "next";
import "./globals.css";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://connectmyskool.com"),
  title: {
    default: "ConnectMySkool — School ERP for Admins, Teachers & Parents",
    template: "%s | ConnectMySkool",
  },
  description:
    "ConnectMySkool gives your school a powerful web portal for staff and a branded mobile app for parents. Attendance, fees, report cards — all in one platform.",
  keywords: [
    "school ERP",
    "school management software",
    "school app for parents",
    "attendance management",
    "fee collection software",
    "Indian school ERP",
    "ConnectMySkool",
  ],
  authors: [{ name: "ConnectMySkool" }],
  creator: "ConnectMySkool",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://connectmyskool.com",
    siteName: "ConnectMySkool",
    title: "ConnectMySkool — The School ERP That Connects Everyone",
    description:
      "A powerful web portal for staff and a beautifully branded mobile app for parents — attendance, fees, report cards, all in one platform.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "ConnectMySkool — School ERP Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ConnectMySkool — School ERP for Admins, Teachers & Parents",
    description:
      "A powerful web portal for staff and a beautifully branded mobile app for parents — all in one platform.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, jakarta.variable)}>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
