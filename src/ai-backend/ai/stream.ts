function parseEvent(frame: string): unknown | null {
  const payload = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');

  if (!payload || payload === '[DONE]') {
    return null;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new Error('The AI service returned an invalid streaming event.');
  }
}

export async function consumeResponseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: unknown) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replaceAll('\r\n', '\n');
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const event = parseEvent(frame);
        if (event) {
          onEvent(event);
        }
      }

      if (done) {
        const event = parseEvent(buffer);
        if (event) {
          onEvent(event);
        }
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
