import type { Metadata } from "next";
import { Inter, Space_Grotesk, Geist_Mono } from "next/font/google";
import { ClerkProvider} from '@clerk/nextjs'
import NavBar from "../components/NavBar";
import "./globals.css";
import SmoothScrolling from "@/components/SmoothScrolling";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Pulse - Precision at Scale",
  description: "Infrastructure intelligence engineered for the absolute edge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} font-body antialiased selection:bg-primary selection:text-on-primary bg-surface-container-lowest text-on-surface min-h-screen`}>
        <ClerkProvider>
          <SmoothScrolling/>
          <NavBar />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
