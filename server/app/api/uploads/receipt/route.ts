import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// Maximum upload limit: 10MB
export const maxDuration = 30;

export const POST = api(async (req: Request) => {
  const s = await requireRole(); // Any authenticated user of the organization

  // Support both multipart/form-data and direct binary/json upload
  const contentType = req.headers.get('content-type') || '';

  let buffer: Buffer;
  let mime: string = 'application/octet-stream';
  let ext = 'bin';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      throw new Error('No file provided');
    }
    mime = file.type || mime;
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else if (contentType.includes('application/json')) {
    const body = await req.json();
    if (!body.data) throw new Error('No data field provided');
    // If client sends base64 data URL
    if (typeof body.data === 'string' && body.data.startsWith('data:')) {
      const match = body.data.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mime = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      buffer = Buffer.from(body.data, 'base64');
      mime = body.mime || mime;
    }
  } else {
    // Raw binary stream
    mime = contentType.split(';')[0] || mime;
    const arrayBuffer = await req.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  // Determine extension
  if (mime.includes('pdf')) ext = 'pdf';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('webp')) ext = 'webp';
  else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';

  // Check upload size limit: 10 MB
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('File exceeds maximum allowed size of 10 MB');
  }

  // Save to public storage directory
  const filename = `receipt-${s.orgId}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'receipts');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  // Return the public URL for storage in PostgreSQL
  const publicUrl = `/uploads/receipts/${filename}`;

  return {
    url: publicUrl,
    mime,
    size: buffer.length,
  };
});
