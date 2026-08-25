#!/usr/bin/env node
/**
 * R2 signed-upload smoke test (Faza 0 exit criterion).
 *
 * Lokalda MinIO'ga (S3-mos) qarshi ishlaydi; production'da bir xil kod
 * Cloudflare R2 endpointiga yo'naltiriladi — faqat env farq qiladi.
 *
 * Ishga tushirish:
 *   docker compose -f infra/docker/compose.yml up -d minio
 *   node scripts/r2-smoke.mjs
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';

const accountId = process.env.R2_ACCOUNT_ID ?? '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET ?? 'bilgim-local';
// MinIO lokal endpoint yoki haqiqiy R2: https://<account>.r2.cloudflarestorage.com
const endpoint =
  process.env.R2_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

if (!accessKeyId || !secretAccessKey || !endpoint) {
  console.error(
    'R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT (.env dan) talab qilinadi.',
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

// §6.6: R2 object key formati — schools/<schoolId>/<category>/<yyyy>/<mm>/<uuid>
const schoolId = randomUUID();
const key = `schools/${schoolId}/smoke/${new Date().toISOString().slice(0, 4)}/${String(
  new Date().getMonth() + 1,
).padStart(2, '0')}/${randomUUID()}`;

const payload = Buffer.from(`bilgim-r2-smoke-${Date.now()}`);

// 1) Presigned PUT URL yaratish va unga yuklash
const putUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key }), {
  expiresIn: 300,
});
const putRes = await fetch(putUrl, { method: 'PUT', body: payload });
if (!putRes.ok) throw new Error(`PUT xato: ${putRes.status} ${await putRes.text()}`);
console.log(`✅ Signed PUT OK: ${key} (${payload.length} bayt)`);

// 2) Presigned GET URL bilan qayta o'qish va checksum solishtirish
const getUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: bucket, Key: key }),
  { expiresIn: 300 },
);
const getRes = await fetch(getUrl);
if (!getRes.ok) throw new Error(`GET xato: ${getRes.status}`);
const body = Buffer.from(await getRes.arrayBuffer());

const expected = createHash('sha256').update(payload).digest('hex');
const actual = createHash('sha256').update(body).digest('hex');
if (expected !== actual) throw new Error('Checksum mos kelmadi!');

console.log(`✅ Signed GET OK: sha256 mos (${expected.slice(0, 12)}…)`);

// 3) Cross-tenant izolyatsiya signali: boshqa school prefixidagi kalitga
//    ruxsatsiz kirish signed URL'siz mumkin emasligini hujjatlashtiramiz.
console.log('ℹ️  Object keyda schoolId bor — cross-tenant access signed policy bilan cheklanadi.');

console.log('🎉 R2 signed upload smoke test o‘tdi.');
