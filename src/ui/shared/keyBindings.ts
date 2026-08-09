const RESERVED_KEYS = new Set(['alt', 'capslock', 'control', 'escape', 'meta', 'shift', 'tab']);

export function normalizeCapturedKey(key: string): string | null {
  if (key === ' ' || key.toLowerCase() === 'spacebar') return ' ';
  const normalized = key.toLowerCase();
  if (!normalized || RESERVED_KEYS.has(normalized)) return null;
  return normalized;
}

export function addKeyBinding(bindings: string[], key: string): string[] {
  const normalized = normalizeCapturedKey(key);
  if (!normalized || bindings.includes(normalized)) return bindings;
  return [...bindings, normalized];
}

export function removeKeyBinding(bindings: string[], key: string): string[] {
  if (bindings.length <= 1) return bindings;
  return bindings.filter((binding) => binding !== key);
}

export function keyBindingLabel(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toUpperCase() : `${key[0].toUpperCase()}${key.slice(1)}`;
}
