export function renderLegalBody(text: string) {
  const paragraphs = text.split('\n\n')
  return paragraphs.map((block, i) => {
    const lines = block.split('\n')
    if (lines.some((l) => l.startsWith('• '))) {
      return (
        <ul key={i} className="list-disc pl-5 space-y-1.5">
          {lines
            .filter((l) => l.startsWith('• '))
            .map((l, j) => (
              <li key={j}>{l.replace(/^•\s*/, '')}</li>
            ))}
        </ul>
      )
    }
    return (
      <p key={i} className="whitespace-pre-wrap">
        {block.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-[#1a2332] font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          ),
        )}
      </p>
    )
  })
}
