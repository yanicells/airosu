import { expect, it } from 'vitest';
import { flagEmoji } from './flag';

it('maps ISO code to regional-indicator emoji', () => {
  expect(flagEmoji('PH')).toBe('🇵🇭');
  expect(flagEmoji('jp')).toBe('🇯🇵');
});
it('falls back to white flag for junk', () => {
  expect(flagEmoji('??')).toBe('🏳️');
  expect(flagEmoji('')).toBe('🏳️');
  expect(flagEmoji('USA')).toBe('🏳️');
});
