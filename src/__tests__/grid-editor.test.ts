import { describe, it, expect } from 'vitest';
import { axisLabels } from '../grid-editor.ts';

describe('axisLabels', () => {
  it('returns X/Z (always XZ plane)', () => {
    expect(axisLabels()).toEqual({ h: 'X', v: 'Z' });
  });
});
