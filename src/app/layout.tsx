import type { Metadata } from 'next'
import './globals.css'
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import UserPanel from '@/components/layout/UserPanel'
import WelcomePrompt from '@/components/layout/WelcomePrompt'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Foovies',
  description: 'Vota con tu grupo qué película ver esta noche',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("dark font-sans", geist.variable)}>
      <body className="flex min-h-screen flex-col bg-gray-950 text-gray-100 antialiased">
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4">
          <div className="lg:flex lg:gap-8">
            <div className="min-w-0 flex-1">
              {children}
            </div>
            <aside className="hidden lg:block lg:w-72 lg:shrink-0 lg:pt-6">
              <div className="sticky top-20">
                <Suspense fallback={null}>
                  <UserPanel />
                </Suspense>
              </div>
            </aside>
          </div>
        </div>
        <Suspense fallback={null}>
          <WelcomePrompt />
        </Suspense>
        <Footer />
      </body>
    </html>
  )
}
