import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { StorageService } from './storage.service';

const config = (storage: Record<string, unknown>) => ({ get: () => ({ storage }) }) as any;

describe('StorageService', () => {
  describe('local driver', () => {
    let dir: string;
    let svc: StorageService;
    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), 'reccora-uploads-'));
      svc = new StorageService(config({ driver: 'local', localDir: dir, apiPublicUrl: 'http://api.test:3000/', region: 'x', bucket: 'b', forcePathStyle: true }));
    });
    afterEach(() => rm(dir, { recursive: true, force: true }));

    it('writes the file to disk and returns a permanent http URL (not a device path)', async () => {
      const url = await svc.put('posts/u1/a.jpg', Buffer.from('hello'), 'image/jpeg');
      expect(url).toBe('http://api.test:3000/uploads/posts/u1/a.jpg');
      expect((await readFile(join(dir, 'posts/u1/a.jpg'))).toString()).toBe('hello');
    });

    it('only treats its own /uploads URLs as managed media', () => {
      expect(svc.isManagedUrl('http://api.test:3000/uploads/posts/u1/a.jpg')).toBe(true);
      expect(svc.isManagedUrl('https://evil.example/uploads/posts/u1/a.jpg')).toBe(false);
      expect(svc.isManagedUrl('file:///data/user/0/cache/photo.jpg')).toBe(false);
    });
  });

  it('s3 driver builds URLs from the public base URL', () => {
    const svc = new StorageService(config({ driver: 's3', localDir: 'uploads', apiPublicUrl: '', region: 'us-east-1', bucket: 'b', publicBaseUrl: 'https://cdn.test/b', forcePathStyle: true }));
    expect(svc.publicUrl('posts/x.jpg')).toBe('https://cdn.test/b/posts/x.jpg');
    expect(svc.isManagedUrl('https://cdn.test/b/posts/x.jpg')).toBe(true);
  });
});
