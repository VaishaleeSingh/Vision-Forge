import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'VisionForge — Multi-Modal AI Content Platform',
  description: 'Generate stunning content, images, and insights with cutting-edge AI. VisionForge combines text generation, image creation, and RAG-powered knowledge chat in one beautiful platform.',
  keywords: ['AI', 'content generation', 'image generation', 'RAG', 'knowledge base', 'Gemini', 'generative AI'],
  authors: [{ name: 'VisionForge' }],
  openGraph: {
    title: 'VisionForge — Multi-Modal AI Content Platform',
    description: 'AI-powered content creation, image generation, and intelligent knowledge chat.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e8ddd0',
              color: '#1a2332',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
