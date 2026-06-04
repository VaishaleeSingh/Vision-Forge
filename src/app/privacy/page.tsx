import type { Metadata } from 'next'
import { LegalPageShell, LegalSection } from '@/components/legal/LegalPageShell'
import { renderLegalBody } from '@/components/legal/renderLegalBody'
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS } from '@/content/legal'

export const metadata: Metadata = {
  title: 'Privacy Policy — VisionForge',
  description: 'How VisionForge collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LEGAL_LAST_UPDATED}>
      <p className="text-[#718096] text-sm -mt-4 mb-2">
        This policy describes how we handle your data when you use VisionForge.
      </p>
      {PRIVACY_SECTIONS.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {renderLegalBody(section.body)}
        </LegalSection>
      ))}
    </LegalPageShell>
  )
}
