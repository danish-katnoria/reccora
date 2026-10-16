/** Minimal auto-mock for PrismaService: prisma.<model>.<method> are jest.fn(); $transaction runs callbacks against the same mock. */
export function createPrismaMock(): any {
  const models = new Map<string, any>();
  const root: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === '$transaction') {
          return jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(root) : Promise.all(arg)));
        }
        if (prop === 'then' || typeof prop === 'symbol') return undefined; // never look like a thenable
        if (prop.startsWith('$') || prop === 'onModuleInit' || prop === 'onModuleDestroy') return prop.startsWith('$') ? jest.fn() : undefined;
        if (!models.has(prop)) {
          const methods = new Map<string, jest.Mock>();
          models.set(
            prop,
            new Proxy({}, { get: (_m, method: string) => { if (!methods.has(method)) methods.set(method, jest.fn()); return methods.get(method); } }),
          );
        }
        return models.get(prop);
      },
    },
  );
  return root;
}
