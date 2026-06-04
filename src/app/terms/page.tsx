import type { Metadata } from 'next'
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell'
import { renderLegalBody } from '@/components/legal/renderLegalBody'
import { LEGAL_LAST_UPDATED, TERMS_SECTIONS } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Terms of Service — VisionForge',
  description: 'Terms of Service for using the VisionForge AI platform.',
}

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LEGAL_LAST_UPDATED}>
      <p className="text-[#718096] text-sm -mt-4 mb-2">
        Please read these terms carefully before using VisionForge.
      </p>
      {TERMS_SECTIONS.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {renderLegalBody(section.body)}
        </LegalSection>
      ))}
    </LegalPageShell>
  )
}
