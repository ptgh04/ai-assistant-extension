import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { MessageBubble } from '../src/interaction/components/chat/MessageBubble';

function renderMessage(role, isStreaming = false, content = 'A readable response') {
  return parseHTML(renderToStaticMarkup(createElement(MessageBubble, {
    message: { id: 'message-1', conversationId: 'chat-1', role, content, timestamp: 1 },
    isStreaming,
  }))).document;
}

test('the assistant streaming cursor is decorative and the response remains readable', () => {
  const document = renderMessage('assistant', true);
  expect(document.querySelector('article').getAttribute('aria-busy')).toBe('true');
  expect(document.querySelector('article').getAttribute('data-role')).toBe('assistant');
  expect(document.querySelector('.streaming-cursor').getAttribute('aria-hidden')).toBe('true');
  expect(document.querySelector('p:last-child').textContent).toBe('A readable response');
});

test.each(['user', 'assistant'])('saved %s messages have no streaming indicator', (role) => {
  const document = renderMessage(role);
  expect(document.querySelector('.streaming-cursor')).toBeNull();
  expect(document.querySelector('article').hasAttribute('aria-busy')).toBe(false);
  expect(document.querySelector('article').getAttribute('data-role')).toBe(role);
});

test('a user message never shows an assistant cursor, even when marked streaming', () => {
  const document = renderMessage('user', true);
  expect(document.querySelector('.streaming-cursor')).toBeNull();
  expect(document.querySelector('article').hasAttribute('aria-busy')).toBe(false);
});

test('animated messages still render AI output as plain text', () => {
  const content = '<script>alert("not executable")</script>';
  const document = renderMessage('assistant', true, content);
  expect(document.querySelector('script')).toBeNull();
  expect(document.querySelector('p:last-child').textContent).toBe(content);
});
