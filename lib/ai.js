// lib/ai.js
// Calls the Anthropic API to adapt a single piece of content into a
// tone/format appropriate for a specific destination community.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function adaptContentForDestination({
  baseContent,
  destination, // e.g. "r/SaaS"
  destinationNotes, // optional free-text: "casual, meme-friendly, hates hard selling"
}) {
  const systemPrompt = `You help founders adapt one piece of content into a version
appropriate for a specific online community. Rewrite the post so it fits the
norms of that community: tone, formatting, and level of directness. Never
make it sound like a hard sales pitch. Do not use marketing buzzwords. Keep
it honest and specific. Output ONLY the rewritten post text, nothing else
(no preamble, no explanation, no markdown fences).`;

  const userPrompt = `Destination: ${destination}
${destinationNotes ? `Notes about this community: ${destinationNotes}` : ""}

Original content:
"""
${baseContent}
"""

Rewrite this for the destination above.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${await res.text()}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text.trim() : "";
}

module.exports = { adaptContentForDestination };
