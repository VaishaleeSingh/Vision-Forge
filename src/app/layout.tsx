import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
