import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Invoice Manager - AI-Powered Invoice Processing',
  description: 'Extract data from invoice images using Claude Vision API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {children}
      </body>
    </html>
  )
}
