import { CommissionRuleScope } from '@prisma/client';

export interface RuleInput {
  id: string;
  scope: CommissionRuleScope;
  rate: number; // creator share of the order amount, 0..1
  isActive: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  creatorId?: string | null;
}

export interface RuleContext {
  creatorId?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
}

const PRECEDENCE: Record<CommissionRuleScope, number> = { CREATOR: 3, BRAND: 2, CATEGORY: 1, DEFAULT: 0 };

/** Most specific active rule wins: CREATOR > BRAND > CATEGORY > DEFAULT. Ties go to the first rule given. */
export function selectRule(rules: RuleInput[], ctx: RuleContext): RuleInput | undefined {
  const matching = rules.filter((r) => {
    if (!r.isActive) return false;
    switch (r.scope) {
      case 'CREATOR': return !!ctx.creatorId && r.creatorId === ctx.creatorId;
      case 'BRAND': return !!ctx.brandId && r.brandId === ctx.brandId;
      case 'CATEGORY': return !!ctx.categoryId && r.categoryId === ctx.categoryId;
      case 'DEFAULT': return true;
    }
  });
  return matching.sort((a, b) => PRECEDENCE[b.scope] - PRECEDENCE[a.scope])[0];
}

/** amount = orderAmount * rate, computed in integer cents and rounded half-up. */
export function calculateCommission(orderAmount: number, rate: number): number {
  if (!(orderAmount > 0) || !(rate > 0)) return 0;
  const cents = Math.round(orderAmount * 100);
  const rateBp = Math.round(rate * 10_000);
  return Math.floor((cents * rateBp + 5_000) / 10_000) / 100;
}
