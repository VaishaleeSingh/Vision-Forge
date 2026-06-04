/** Legal page metadata — update lastUpdated when policies change */
export const LEGAL_LAST_UPDATED = 'June 3, 2026'

export const TERMS_SECTIONS = [
  {
    title: '1. Agreement to Terms',
    body: `By accessing or using VisionForge ("Service," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not create an account or use the Service.

These Terms apply to all visitors, registered users, and others who access the Service.`,
  },
  {
    title: '2. Description of Service',
    body: `VisionForge is a multi-modal AI platform that provides tools including text generation, image generation, document-based knowledge chat (RAG), AI agent workflows, analytics, and related features. Features may use third-party AI providers (such as Google Gemini, Groq, Hugging Face, and others) to process your inputs and return outputs.

We may modify, suspend, or discontinue any part of the Service at any time with or without notice.`,
  },
  {
    title: '3. Eligibility and Accounts',
    body: `You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.

You agree to provide accurate registration information and to update it as needed. You must notify us promptly of any unauthorized use of your account.`,
  },
  {
    title: '4. Acceptable Use',
    body: `You agree not to use the Service to:

• Violate any applicable law or regulation
• Infringe intellectual property, privacy, or other rights of others
• Upload malware, spam, or unlawful, harmful, or abusive content
• Attempt to gain unauthorized access to systems, accounts, or data
• Reverse engineer, scrape, or overload the Service except as permitted by law
• Generate content that promotes violence, illegal activity, harassment, or discrimination
• Misrepresent AI-generated output as human-authored professional advice (legal, medical, financial) without appropriate disclosure

We may suspend or terminate accounts that violate these rules.`,
  },
  {
    title: '5. Your Content and AI Outputs',
    body: `You retain ownership of content you submit ("Input"), including prompts, uploads, and files, subject to licenses you grant us below.

AI-generated responses ("Output") may be inaccurate, incomplete, or inappropriate. You are solely responsible for reviewing Output before use and for how you publish or rely on it.

By using the Service, you grant us a worldwide, non-exclusive license to host, process, transmit, and display your Input and Output solely to operate, improve, and secure the Service, including sending data to AI providers as needed to fulfill your requests.`,
  },
  {
    title: '6. Third-Party Services',
    body: `The Service integrates third-party APIs and infrastructure (e.g., hosting, databases, AI models). Your use may be subject to those providers' terms and policies. We are not responsible for third-party services outside our reasonable control.

Links to external sites do not imply endorsement.`,
  },
  {
    title: '7. Intellectual Property',
    body: `VisionForge branding, software, design, and documentation are owned by us or our licensors and protected by applicable intellectual property laws. Except as expressly allowed in these Terms, you may not copy, modify, or distribute our proprietary materials.

Feedback you provide may be used by us without obligation to you.`,
  },
  {
    title: '8. Free and Paid Features',
    body: `We may offer free and paid tiers. Usage limits, rate limits, and feature availability may change. If paid plans are introduced, additional payment terms will apply.

Third-party AI providers may impose their own usage limits or fees that affect Service availability.`,
  },
  {
    title: '9. Disclaimer of Warranties',
    body: `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI OUTPUTS WILL BE ACCURATE OR RELIABLE.`,
  },
  {
    title: '10. Limitation of Liability',
    body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES, OFFICERS, EMPLOYEES, AND SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.

OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS ($100).`,
  },
  {
    title: '11. Indemnification',
    body: `You agree to indemnify and hold harmless VisionForge from claims, damages, and expenses (including reasonable attorneys' fees) arising from your use of the Service, your Input or Output, or your violation of these Terms.`,
  },
  {
    title: '12. Termination',
    body: `You may stop using the Service at any time. We may suspend or terminate your access for violation of these Terms, risk to the Service, or as required by law.

Upon termination, provisions that by nature should survive (including disclaimers, limitations of liability, and indemnity) will remain in effect.`,
  },
  {
    title: '13. Governing Law and Disputes',
    body: `These Terms are governed by the laws of the jurisdiction in which VisionForge operates, without regard to conflict-of-law rules, except where mandatory consumer protections apply in your country.

Disputes should first be addressed by contacting us. Where permitted, disputes may be resolved through binding arbitration or courts in our principal place of business.`,
  },
  {
    title: '14. Changes to Terms',
    body: `We may update these Terms from time to time. We will post the revised version with an updated "Last updated" date. Continued use after changes constitutes acceptance of the revised Terms.`,
  },
  {
    title: '15. Contact',
    body: `Questions about these Terms: contact us through the support channel listed on the VisionForge website or in your account settings.`,
  },
] as const

export const PRIVACY_SECTIONS = [
  {
    title: '1. Introduction',
    body: `This Privacy Policy explains how VisionForge ("we," "us") collects, uses, shares, and protects information when you use our website and application (the "Service").

By using the Service, you agree to this Policy. If you do not agree, please do not use the Service.`,
  },
  {
    title: '2. Information We Collect',
    body: `We may collect:

**Account information** — name, email address, and password (stored using industry-standard hashing; we do not store plain-text passwords).

**Usage data** — prompts, generations, agent runs, library items, favorites, token estimates, and feature interactions needed to operate the Service.

**Uploaded content** — documents and files you submit to knowledge bases or other features, including text extracted for search and chat.

**Technical data** — IP address, browser type, device information, session identifiers, and logs for security, debugging, and performance.

**Cookies and similar technologies** — used for authentication sessions and essential Service functionality.`,
  },
  {
    title: '3. How We Use Information',
    body: `We use information to:

• Provide, maintain, and improve the Service
• Authenticate users and secure accounts
• Process your requests through AI and infrastructure providers
• Store your library, analytics, and knowledge-base embeddings
• Enforce our Terms and prevent abuse
• Communicate service-related notices
• Comply with legal obligations

We do not sell your personal information to third parties for their marketing purposes.`,
  },
  {
    title: '4. AI Processing and Third Parties',
    body: `To deliver AI features, we send relevant portions of your Input (prompts, document excerpts, CSV summaries, etc.) to third-party AI and infrastructure providers. These may include Google (Gemini), Groq, Hugging Face, image generation APIs, and cloud hosting/database providers.

Each provider processes data according to its own privacy policy and terms. We select providers that support our security requirements but cannot control all aspects of their operations.

Do not submit sensitive personal data (e.g., government IDs, full payment card numbers, protected health information) unless you accept the risks of AI processing.`,
  },
  {
    title: '5. Data Storage and Retention',
    body: `Data is stored on secure cloud infrastructure (e.g., MongoDB Atlas and application servers). We retain account and usage data while your account is active and for a reasonable period afterward for backup, legal, or security purposes.

You may delete certain content (e.g., library items or documents) through the Service where deletion features are available. Account deletion requests may be handled through support or settings when offered.`,
  },
  {
    title: '6. Sharing of Information',
    body: `We may share information with:

• **Service providers** who help us host, analyze, or operate the Service (under confidentiality obligations)
• **AI providers** to fulfill your generation and chat requests
• **Legal authorities** when required by law or to protect rights, safety, and security
• **Business transfers** in connection with a merger, acquisition, or asset sale (with notice where required)

We do not publicly display your email or password.`,
  },
  {
    title: '7. Security',
    body: `We implement reasonable technical and organizational measures, including encrypted connections (HTTPS), hashed passwords, authentication controls, and access limitations.

No method of transmission or storage is 100% secure. You are responsible for using a strong password and keeping credentials confidential.`,
  },
  {
    title: '8. Your Rights and Choices',
    body: `Depending on your location, you may have rights to access, correct, delete, or export personal data, or to object to or restrict certain processing.

To exercise rights, contact us through the channels listed below. We may verify your identity before responding. You can update account details in settings where available.`,
  },
  {
    title: '9. International Users',
    body: `If you access the Service from outside our primary operating region, your information may be transferred to and processed in countries with different data protection laws. We take steps designed to protect data in line with this Policy.`,
  },
  {
    title: '10. Children',
    body: `The Service is not directed to children under 13 (or the applicable age in your region). We do not knowingly collect personal information from children. Contact us if you believe a child has provided data so we can delete it.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. The "Last updated" date at the top will change when we do. Material changes may be communicated via the Service or email where appropriate.`,
  },
  {
    title: '12. Contact Us',
    body: `Privacy questions or requests: use the support contact listed on the VisionForge website or in your account settings.`,
  },
] as const
