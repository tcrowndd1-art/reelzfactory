import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReelzFactory v2.0 - AI Video Auto-Edit Studio",
  description: "Topic to YouTube in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a" }}>
        <Sidebar />
        <main style={{
          marginLeft: 220,
          flex: 1,
          minHeight: "100vh",
          overflow: "auto",
        }}>
          {children}
        </main>
      </body>
    </html>
  );
}