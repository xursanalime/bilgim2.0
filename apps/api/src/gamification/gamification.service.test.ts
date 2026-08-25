import { describe, expect, it } from 'vitest';
import { levelForXp, nextLevelThreshold } from './gamification.service';

describe('Gamification level thresholds (§4.3.1)', () => {
  it('threshold jadval bo\'yicha level qaytadi', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(450)).toBe(4);
    expect(levelForXp(2510)).toBe(9); // max
  });

  it('keyingi level threshold chiqaradi', () => {
    expect(nextLevelThreshold(0)).toBe(100);
    expect(nextLevelThreshold(99)).toBe(100);
    expect(nextLevelThreshold(100)).toBe(250);
    expect(nextLevelThreshold(3000)).toBe(-1); // max level
  });
});