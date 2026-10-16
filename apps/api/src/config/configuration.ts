export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  publicWebUrl: string;
  jwt: { accessSecret: string; refreshSecret: string; accessTtl: string; refreshTtlDays: number };
  storage: {
    /** 's3' (default, MinIO/S3/R2) or 'local' (writes to disk and serves from /uploads; dev only). */
    driver: 's3' | 'local';
    localDir: string;
    /** Public origin of this API, used to build /uploads URLs for the local driver. */
    apiPublicUrl: string;
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicBaseUrl?: string;
    forcePathStyle: boolean;
  };
  mail: { from: string; smtpUrl?: string };
  affiliate: { webhookSecret?: string };
  tracking: { ipHashSalt: string };
  requireEmailVerification: boolean;
  creatorAutoApprove: boolean;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key];
  if (!v) throw new Error(`Missing required environment variable ${key}`);
  return v;
}

export function validateEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  required(env, 'DATABASE_URL');
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const v = required(env, k);
    if (v.length < 32) throw new Error(`${k} must be at least 32 characters`);
  }
  return env;
}

export default (): { app: AppConfig } => {
  const env = process.env;
  return {
    app: {
      nodeEnv: env.NODE_ENV ?? 'development',
      port: parseInt(env.PORT ?? '3000', 10),
      corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      publicWebUrl: env.PUBLIC_WEB_URL ?? 'http://localhost:3000',
      jwt: {
        accessSecret: env.JWT_ACCESS_SECRET as string,
        refreshSecret: env.JWT_REFRESH_SECRET as string,
        accessTtl: env.JWT_ACCESS_TTL ?? '15m',
        refreshTtlDays: parseInt(env.JWT_REFRESH_TTL_DAYS ?? '30', 10),
      },
      storage: {
        driver: env.STORAGE_DRIVER === 'local' ? 'local' : 's3',
        localDir: env.LOCAL_UPLOAD_DIR ?? 'uploads',
        apiPublicUrl: env.API_PUBLIC_URL ?? `http://localhost:${env.PORT ?? '3000'}`,
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION ?? 'us-east-1',
        bucket: env.S3_BUCKET ?? 'reccora-media',
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        publicBaseUrl: env.S3_PUBLIC_BASE_URL,
        forcePathStyle: (env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
      },
      mail: { from: env.MAIL_FROM ?? 'Reccora <no-reply@localhost>', smtpUrl: env.SMTP_URL },
      affiliate: { webhookSecret: env.AFFILIATE_WEBHOOK_SECRET },
      tracking: { ipHashSalt: env.IP_HASH_SALT ?? 'dev-salt' },
      requireEmailVerification: (env.REQUIRE_EMAIL_VERIFICATION ?? 'false') === 'true',
      creatorAutoApprove: (env.CREATOR_AUTO_APPROVE ?? 'true') === 'true',
    },
  };
};
