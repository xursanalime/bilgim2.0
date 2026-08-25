import { describe, expect, it } from 'vitest';
import {
  schoolSlugSchema,
  schoolSlugIssues,
  isReservedSlug,
  normalizeSlug,
  RESERVED_SCHOOL_SLUGS,
} from './tenant';

describe('schoolSlugSchema (§2.1)', () => {
  it('valid shitlar qabul qiladi', () => {
    expect(schoolSlugSchema.safeParse('aziz-school').success).toBe(true);
    expect(schoolSlugSchema.safeParse('english').success).toBe(true);
    expect(schoolSlugSchema.safeParse('a1b2c3').success).toBe(true);
  });

  it('uzun cheklovlarini rad etadi', () => {
    expect(schoolSlugSchema.safeParse('ab').success).toBe(false); // <3
    expect(schoolSlugSchema.safeParse('a'.repeat(41)).success).toBe(false); // >40
  });

  it('bosh/oxirda "-" ni rad etadi', () => {
    expect(schoolSlugSchema.safeParse('-abc').success).toBe(false);
    expect(schoolSlugSchema.safeParse('abc-').success).toBe(false);
  });

  it('reserved sluglarni rad etadi', () => {
    for (const s of RESERVED_SCHOOL_SLUGS) {
      expect(schoolSlugSchema.safeParse(s).success).toBe(false);
      expect(isReservedSlug(s)).toBe(true);
    }
  });

  it('bosh harf va bo\'shliqni rad etadi (lower-case ASCII)', () => {
    expect(schoolSlugSchema.safeParse('Aziz').success).toBe(false);
    expect(schoolSlugSchema.safeParse('aziz school').success).toBe(false);
  });

  it('schoolSlugIssues xato xabarlarini qaytaradi', () => {
    expect(schoolSlugIssues('www').length).toBeGreaterThan(0);
    expect(schoolSlugIssues('aziz-school')).toEqual([]);
  });

  it('normalizeSlug kichik harf qiladi va trim qiladi', () => {
    expect(normalizeSlug('  Aziz-School ')).toBe('aziz-school');
  });
});