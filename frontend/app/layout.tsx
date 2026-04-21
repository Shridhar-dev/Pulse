import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { ClerkProvider} from '@clerk/nextjs'
import NavBar from "../components/NavBar";
import "./globals.css";
import SmoothScrolling from "@/components/SmoothScrolling";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
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
      <body className={`${inter.variable} ${geistMono.variable} font-body antialiased selection:bg-primary selection:text-on-primary bg-surface-container-lowest text-on-surface min-h-screen`}>
        <ClerkProvider>
          <SmoothScrolling/>
          <NavBar />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
