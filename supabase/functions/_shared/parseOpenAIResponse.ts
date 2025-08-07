export function parseOpenAIResponse(input: string) {
  if (typeof input !== 'string') {
    console.error('parseOpenAIResponse expected a string input:', input);
    return null;
  }

  const cleaned = input
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse JSON from OpenAI response:', { error: (error as Error).message, raw: input });
    return null;
  }
}
