import type { Metadata } from "next";
import { Inter } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
