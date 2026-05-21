import type { Metadata } from 'next'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Foovies',
  description: 'Vota con tu grupo qué película ver esta noche',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("dark font-sans", geist.variable)}>
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
