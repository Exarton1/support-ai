import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Support.ai",
  description: "the chatbot that you can embed in your website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="remove-cz-shortcut-listen"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: "(function(){try{document.body.removeAttribute('cz-shortcut-listen');document.documentElement.removeAttribute('cz-shortcut-listen');}catch(e){} })();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
