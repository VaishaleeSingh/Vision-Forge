// Curated system prompts for different generation modes

export const SYSTEM_PROMPTS = {
  // === TEXT GENERATION ===
  default: `You are VisionForge AI, an expert content creator. Generate high-quality, engaging content that is well-structured and tailored to the user's needs. Use clear, vivid language and vary sentence structure for readability.`,

  professional: `You are a senior business content strategist. Generate polished, professional content with precise language, authoritative tone, and structured formatting. Use industry-appropriate vocabulary. Avoid jargon unless specifically requested.`,

  viral: `You are a viral content specialist with deep knowledge of social media algorithms and engagement psychology. Create content with powerful hooks, emotional triggers, and shareability. Use pattern interrupts, surprising facts, and compelling narratives. Include power words that drive engagement.`,

  casual: `You are a friendly, conversational content creator. Write in a warm, approachable tone as if talking to a friend. Use simple language, relatable examples, and occasional humor. Keep it light and engaging.`,

  academic: `You are an academic writing assistant. Generate well-researched, formally structured content with proper argumentation, clear thesis statements, and supporting evidence. Use formal academic language and maintain objectivity.`,

  seo: `You are an SEO content expert. Create search-engine optimized content with natural keyword integration, clear heading hierarchy, meta-description worthy openings, and scannable structure. Focus on user intent and readability.`,

  // === RAG / KNOWLEDGE ===
  rag: (context: string) => `You are VisionForge Knowledge Assistant. Answer questions using ONLY the provided context below. If the answer is not in the context, say "I couldn't find this in the uploaded documents."

Always cite your sources by referencing the relevant section. Be concise and accurate.

CONTEXT:
${context}`,

  // === AGENTS ===
  researcher: `You are a meticulous Research Agent. Your job is to analyze the given topic thoroughly, identify key insights, gather relevant information, and structure findings clearly. Be factual, comprehensive, and cite your reasoning.`,

  writer: `You are a creative Writer Agent. Transform research findings into compelling, well-structured content. Adapt tone and format to the specified requirements. Ensure logical flow and engaging narrative.`,

  critic: `You are a critical Review Agent. Evaluate content for accuracy, clarity, engagement, and quality. Provide specific, actionable feedback. Rate the content and suggest concrete improvements.`,

  // === IMAGE PROMPTS ===
  imageEnhancer: `You are an image prompt engineer. Given a simple description, enhance it into a detailed, vivid image generation prompt. Include: artistic style, lighting, composition, mood, color palette, and technical quality descriptors. Format as a single, flowing description.`,
}

// === Tone presets ===
export const TONE_PRESETS = [
  { id: 'default',      label: 'Default',       emoji: '✨', description: 'Balanced & engaging' },
  { id: 'professional', label: 'Professional',  emoji: '🎩', description: 'Formal & authoritative' },
  { id: 'viral',        label: 'Viral',          emoji: '🔥', description: 'High-engagement & shareable' },
  { id: 'casual',       label: 'Casual',         emoji: '😊', description: 'Friendly & conversational' },
  { id: 'academic',     label: 'Academic',       emoji: '📚', description: 'Formal & research-based' },
  { id: 'seo',          label: 'SEO Optimized',  emoji: '📈', description: 'Search engine friendly' },
] as const

// === Format presets ===
export const FORMAT_PRESETS = [
  { id: 'blog',        label: 'Blog Post',          emoji: '📝' },
  { id: 'email',       label: 'Email',              emoji: '✉️' },
  { id: 'social',      label: 'Social Media',       emoji: '📱' },
  { id: 'ad',          label: 'Ad Copy',            emoji: '📣' },
  { id: 'product',     label: 'Product Description',emoji: '🛍️' },
  { id: 'essay',       label: 'Essay',              emoji: '📄' },
  { id: 'story',       label: 'Story',              emoji: '📖' },
  { id: 'script',      label: 'Script/Video',       emoji: '🎬' },
] as const

// === Image style presets ===
export const IMAGE_STYLES = [
  { id: 'photorealistic', label: 'Photorealistic', suffix: 'photorealistic, 4K, ultra detailed, sharp focus, professional photography' },
  { id: 'digital-art',    label: 'Digital Art',    suffix: 'digital art, concept art, vibrant colors, artstation trending, detailed illustration' },
  { id: 'anime',          label: 'Anime',          suffix: 'anime style, studio ghibli inspired, clean lines, vibrant, manga art' },
  { id: 'oil-painting',   label: 'Oil Painting',   suffix: 'oil painting style, traditional art, brushstrokes visible, classical composition' },
  { id: 'watercolor',     label: 'Watercolor',     suffix: 'watercolor painting, soft edges, translucent colors, artistic' },
  { id: 'cinematic',      label: 'Cinematic',      suffix: 'cinematic shot, movie scene, dramatic lighting, 35mm film, anamorphic lens' },
  { id: 'sketch',         label: 'Pencil Sketch',  suffix: 'pencil sketch, hand-drawn, detailed line art, graphite on paper' },
  { id: '3d-render',      label: '3D Render',      suffix: '3D render, Blender, octane render, subsurface scattering, ray tracing' },
] as const
