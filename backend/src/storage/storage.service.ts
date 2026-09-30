import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

/**
 * Two roots:
 *  - public uploads (served at /uploads/…): notices' images, published documents, gallery photos
 *  - private files (never served directly): report cards and anything with a pupil's data
 * Both default to folders beside the API and map to Docker volumes in production.
 */
@Injectable()
export class StorageService {
  readonly uploadsDir: string;
  readonly privateDir: string;

  constructor(private config: ConfigService) {
    this.uploadsDir = this.resolveDir(this.config.get<string>('UPLOAD_DIR') || './uploads');
    this.privateDir = this.resolveDir(this.config.get<string>('PRIVATE_FILES_DIR') || './storage/private');
  }

  private resolveDir(dir: string) {
    const absolute = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    if (!existsSync(absolute)) mkdirSync(absolute, { recursive: true });
    return absolute;
  }

  /** Relative public URL for a file inside the uploads root. */
  publicUrl(relativePath: string) {
    return `/uploads/${relativePath.split('\\').join('/')}`;
  }

  /** Year/month folder under the public uploads root (created on demand for multer). */
  monthUploadDir(now = new Date()) {
    const folder = join(
      this.uploadsDir,
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
    );
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true });
    return folder;
  }

  /** Turn an absolute path under uploadsDir into the public `/uploads/…` URL. */
  publicUrlFromAbsolute(absolutePath: string) {
    const relative = absolutePath.slice(this.uploadsDir.length).replace(/^[\\/]+/, '').split('\\').join('/');
    return this.publicUrl(relative);
  }

  async writePrivate(relativePath: string, data: Buffer) {
    const target = this.privatePath(relativePath);
    await fs.mkdir(join(target, '..'), { recursive: true });
    await fs.writeFile(target, data);
    return relativePath;
  }

  async readPrivate(relativePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.privatePath(relativePath));
    } catch {
      return null;
    }
  }

  async removePrivate(relativePath: string) {
    await fs.rm(this.privatePath(relativePath), { force: true });
  }

  async removePublic(relativeUrl: string) {
    const relative = relativeUrl.replace(/^\/?uploads\//, '');
    const target = resolve(this.uploadsDir, relative);
    if (!target.startsWith(this.uploadsDir)) return;
    await fs.rm(target, { force: true });
  }

  private privatePath(relativePath: string) {
    const target = resolve(this.privateDir, relativePath);
    if (!target.startsWith(this.privateDir)) {
      throw new Error('Path escapes the private storage root');
    }
    return target;
  }
}
