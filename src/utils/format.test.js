import test from 'node:test';
import assert from 'node:assert';
import { formatMonthYear } from './format.js';

test('formatMonthYear', async (t) => {
  await t.test('should format Janeiro 2023 correctly', () => {
    assert.strictEqual(formatMonthYear(2023, 1), 'Janeiro 2023');
  });

  await t.test('should format Dezembro 2024 correctly', () => {
    assert.strictEqual(formatMonthYear(2024, 12), 'Dezembro 2024');
  });

  await t.test('should handle numeric strings', () => {
    assert.strictEqual(formatMonthYear('2023', '5'), 'Maio 2023');
  });

  await t.test('should handle month 0 as invalid', () => {
    assert.strictEqual(formatMonthYear(2023, 0), 'Mês inválido 2023');
  });

  await t.test('should handle month 13 as invalid', () => {
    assert.strictEqual(formatMonthYear(2023, 13), 'Mês inválido 2023');
  });

  await t.test('should handle non-numeric month', () => {
    assert.strictEqual(formatMonthYear(2023, 'abc'), 'Mês inválido 2023');
  });

  await t.test('should handle missing year', () => {
    assert.strictEqual(formatMonthYear(undefined, 1), 'Janeiro');
  });
});
