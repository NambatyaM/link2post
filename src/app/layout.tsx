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
  title: "Link2Post — Paste Once. Build a Month of LinkedIn Authority.",
  description:
    "The AI ghostwriter that turns your podcasts, meetings, and notes into high-performing LinkedIn content — complete with visual asset strategies.",
  icons: { icon: "/logo.png" },
  openGraph: {
    title: "Link2Post — Paste Once. Build a Month of LinkedIn Authority.",
    description: "Transform raw transcripts into a month of authentic, high-performing LinkedIn content with AI-powered visual strategies.",
    type: "website",
  },
};

const THEME_INIT = `
  (function() {
    try {
      var t = localStorage.getItem('link2post_theme');
      if (t === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </body>
    </html>
  );
}
