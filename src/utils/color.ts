import type { CSSProperties } from 'react';

const presetColors = new Set(['blue', 'green', 'orange', 'purple', 'navy', 'red']);

export function isPresetColor(color: string) {
  return presetColors.has(color);
}

export function colorClassName(color: string, customClassName = 'custom-color') {
  return isPresetColor(color) ? color : customClassName;
}

export function customColorStyle(color: string): CSSProperties | undefined {
  if (isPresetColor(color)) return undefined;
  return { '--custom-color': color } as CSSProperties;
}

export function colorInputValue(color: string, fallback = '#6654e8') {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}
