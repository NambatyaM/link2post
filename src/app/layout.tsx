import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://link2post.vercel.app"),
  title: "Link2Post — Paste One Transcript. Get 30 Days of LinkedIn Content.",
  description:
    "Turn any transcript (podcast, meeting, YouTube) into a month of LinkedIn posts, carousels, articles, and a content calendar. Written in your voice. Free to start.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "Link2Post — Paste Once. Build a Month of LinkedIn Authority.",
    description: "Transform raw transcripts into 30 days of authentic, high-performing LinkedIn content with AI-powered visual strategies.",
    url: "https://link2post.vercel.app",
    siteName: "Link2Post",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Link2Post — Paste Once. Build a Month of LinkedIn Authority.",
    description: "Transform raw transcripts into 30 days of authentic, high-performing LinkedIn content.",
    images: ["/logo.png"],
  },
  keywords: ["LinkedIn content", "content repurposing", "AI writing", "LinkedIn growth", "content calendar", "carousel maker", "ghostwriter"],
};

const THEME_INIT = `
  (function() {
    try {
      var t = localStorage.getItem('link2post_theme');
      if (t === 'dark') document.documentElement.classList.remove('light');
      else document.documentElement.classList.add('light');
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
