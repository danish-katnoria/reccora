import { calculateCommission, RuleInput, selectRule } from './commission-calculator';

const rule = (o: Partial<RuleInput> & Pick<RuleInput, 'id' | 'scope' | 'rate'>): RuleInput => ({ isActive: true, ...o });

describe('calculateCommission', () => {
  it('multiplies order amount by rate and rounds to cents', () => {
    expect(calculateCommission(100, 0.1)).toBe(10);
    expect(calculateCommission(19.99, 0.1)).toBe(2); // 1.999 -> 2.00
    expect(calculateCommission(33.33, 0.075)).toBe(2.5); // 2.49975 -> 2.50
  });
  it('rounds half up', () => {
    expect(calculateCommission(0.05, 0.5)).toBe(0.03); // 0.025 -> 0.03
  });
  it('returns 0 for non-positive inputs', () => {
    expect(calculateCommission(0, 0.1)).toBe(0);
    expect(calculateCommission(-5, 0.1)).toBe(0);
    expect(calculateCommission(50, 0)).toBe(0);
  });
});

describe('selectRule', () => {
  const rules = [
    rule({ id: 'd', scope: 'DEFAULT', rate: 0.05 }),
    rule({ id: 'c', scope: 'CATEGORY', rate: 0.08, categoryId: 'cat1' }),
    rule({ id: 'b', scope: 'BRAND', rate: 0.12, brandId: 'brand1' }),
    rule({ id: 'cr', scope: 'CREATOR', rate: 0.2, creatorId: 'creator1' }),
    rule({ id: 'off', scope: 'CREATOR', rate: 0.5, creatorId: 'creator2', isActive: false }),
  ];
  it('falls back to default', () => expect(selectRule(rules, { creatorId: 'x' })?.id).toBe('d'));
  it('prefers category over default', () => expect(selectRule(rules, { creatorId: 'x', categoryId: 'cat1' })?.id).toBe('c'));
  it('prefers brand over category', () => expect(selectRule(rules, { creatorId: 'x', categoryId: 'cat1', brandId: 'brand1' })?.id).toBe('b'));
  it('prefers creator over everything', () => expect(selectRule(rules, { creatorId: 'creator1', categoryId: 'cat1', brandId: 'brand1' })?.id).toBe('cr'));
  it('ignores inactive rules', () => expect(selectRule(rules, { creatorId: 'creator2' })?.id).toBe('d'));
  it('returns undefined with no rules', () => expect(selectRule([], {})).toBeUndefined());
});
