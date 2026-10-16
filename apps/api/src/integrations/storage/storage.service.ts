import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { AppConfig } from '../../config/configuration';

/** Thin S3-compatible wrapper (AWS S3, MinIO, R2, ...). */
@Injectable()
export class StorageService {
  private client: S3Client;
  private cfg: AppConfig['storage'];

  constructor(config: ConfigService) {
    this.cfg = config.get<AppConfig>('app')!.storage;
    this.client = new S3Client({
      region: this.cfg.region,
      endpoint: this.cfg.endpoint,
      forcePathStyle: this.cfg.forcePathStyle,
      credentials:
        this.cfg.accessKeyId && this.cfg.secretAccessKey
          ? { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey }
          : undefined,
    });
  }

  /** Absolute directory served at /uploads when the local driver is active. */
  get localRoot(): string {
    return resolve(this.cfg.localDir);
  }

  get isLocal(): boolean {
    return this.cfg.driver === 'local';
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.isLocal) {
      const file = join(this.localRoot, key);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, body);
      return this.publicUrl(key);
    }
    await this.client.send(
      new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
    return this.publicUrl(key);
  }

  /** True when the URL points at our own bucket. Used to stop users attaching arbitrary hosts as post media. */
  isManagedUrl(url: string): boolean {
    return url.startsWith(this.publicUrl(''));
  }

  publicUrl(key: string): string {
    if (this.isLocal) return `${this.cfg.apiPublicUrl.replace(/\/$/, '')}/uploads/${key}`;
    const base = this.cfg.publicBaseUrl ?? `${this.cfg.endpoint ?? ''}/${this.cfg.bucket}`;
    return `${base.replace(/\/$/, '')}/${key}`;
  }
}
