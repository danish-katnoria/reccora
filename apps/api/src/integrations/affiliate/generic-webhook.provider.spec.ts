import { createHmac } from 'crypto';
import { GenericWebhookProvider } from './generic-webhook.provider';

const make = (secret?: string) => new GenericWebhookProvider({ get: () => ({ affiliate: { webhookSecret: secret } }) } as any);
const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body).digest('hex');

describe('GenericWebhookProvider', () => {
  const body = JSON.stringify({ events: [{ id: 'e1', ref: 'rc_1', status: 'confirmed', amount: '12.5', currency: 'usd', occurredAt: '2026-01-01T00:00:00Z' }] });

  it('is disabled without a secret and rejects everything', () => {
    const p = make(undefined);
    expect(p.enabled).toBe(false);
    expect(p.verifyCallback(body, { 'x-reccora-signature': sign(body, 'x') })).toBe(false);
  });
  it('accepts a valid signature', () => expect(make('s3cret').verifyCallback(body, { 'x-reccora-signature': sign(body, 's3cret') })).toBe(true));
  it('rejects a bad / missing / malformed signature', () => {
    const p = make('s3cret');
    expect(p.verifyCallback(body, { 'x-reccora-signature': sign(body, 'wrong') })).toBe(false);
    expect(p.verifyCallback(body, {})).toBe(false);
    expect(p.verifyCallback(body, { 'x-reccora-signature': 'zz' })).toBe(false);
  });
  it('rejects a tampered body', () => {
    const p = make('s3cret');
    expect(p.verifyCallback(body.replace('12.5', '1200'), { 'x-reccora-signature': sign(body, 's3cret') })).toBe(false);
  });
  it('parses events into normalised conversions', () => {
    const [e] = make('s').parseCallback(JSON.parse(body));
    expect(e).toMatchObject({ provider: 'generic', externalId: 'e1', attributionRef: 'rc_1', status: 'CONFIRMED', orderAmount: 12.5, currency: 'USD' });
  });
});
