import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { PROVIDERS } from '../src/ai-backend/ai/types';
import { ModelSelect } from '../src/interaction/components/settings/ModelSelect';

test.each(PROVIDERS)('$id dropdown contains only its models and selects the saved choice', ({ id, models }) => {
  const selected = models[1].id;
  const { document } = parseHTML(renderToStaticMarkup(createElement(ModelSelect, {
    id: 'model', provider: id, model: selected, onChange() {},
  })));
  const options = Array.from(document.querySelectorAll('option'));
  expect(options.map((option) => option.getAttribute('value'))).toEqual(models.map((model) => model.id));
  expect(options.length).toBeGreaterThan(3);
  expect(new Set(models.map((model) => model.id)).size).toBe(models.length);
  expect(document.querySelector('option[selected]')?.getAttribute('value')).toBe(selected);
  expect(document.querySelector('label')?.getAttribute('for')).toBe('model');
  expect(document.querySelector('select')?.getAttribute('aria-describedby')).toBe('model-help');
});

test('an older saved model remains visible without silently selecting a different model', () => {
  const saved = 'previously-saved-model';
  const { document } = parseHTML(renderToStaticMarkup(createElement(ModelSelect, {
    id: 'model', provider: 'openai', model: saved, disabled: true, onChange() {},
  })));
  expect(document.querySelector('option[selected]')?.getAttribute('value')).toBe(saved);
  expect(document.querySelector('option[selected]')?.textContent).toContain('Saved model');
  expect(document.querySelector('select')?.hasAttribute('disabled')).toBe(true);
  expect(document.querySelectorAll('option')).toHaveLength(PROVIDERS[0].models.length + 1);
});
