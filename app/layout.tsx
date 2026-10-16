import type { Metadata } from "next"
import { Caveat, Geist_Mono, Inter } from "next/font/google"
import localFont from "next/font/local"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

// Acctual's pairing: Open Runde for headings and big numbers, Inter for text.
const openRunde = localFont({
  variable: "--font-open-runde",
  src: [
    { path: "./fonts/OpenRunde-Regular.woff2", weight: "400" },
    { path: "./fonts/OpenRunde-Medium.woff2", weight: "500" },
    { path: "./fonts/OpenRunde-Semibold.woff2", weight: "600" },
    { path: "./fonts/OpenRunde-Bold.woff2", weight: "700" },
  ],
})

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

// Handwriting for the sticky notes on Home (Acctual uses Caveat for the same touch).
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "600", "700"] })

export const metadata: Metadata = {
  title: { default: "Tapanta Books", template: "%s · Tapanta Books" },
  description: "Clickable prototype of the Tapanta Books accounting app.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={`${inter.variable} ${openRunde.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
