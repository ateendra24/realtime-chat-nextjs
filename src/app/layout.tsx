import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner"
import { siteConfig } from "@/config/siteConfig";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.name,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: "/s0.png",
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: siteConfig.author.twitter,
    creator: siteConfig.author.twitter,
    title: siteConfig.name,
    description: siteConfig.description,
    images: ["/s0.png"],
  },
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`font-Satoshi antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster position="bottom-right" />
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
