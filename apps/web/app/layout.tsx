import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { template: "%s · Convera", default: "Convera" },
  description: "Ubah percakapan WhatsApp bisnis menjadi event konversi Meta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
