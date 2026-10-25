// Upload zdjęć na dysk (na Railway podłącz Volume i ustaw UPLOAD_DIR, np. /data/uploads).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

function storage(sub) {
  const dir = path.join(UPLOAD_DIR, sub);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex') + ALLOWED[file.mimetype])
  });
}

function uploader(sub, { maxFiles = 30, maxMb = 10 } = {}) {
  return multer({
    storage: storage(sub),
    limits: { fileSize: maxMb * 1024 * 1024, files: maxFiles },
    fileFilter: (req, file, cb) => cb(null, !!ALLOWED[file.mimetype])
  });
}

function publicUrl(sub, file) {
  return `/uploads/${sub}/${file.filename}`;
}

function removeFile(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const p = path.join(UPLOAD_DIR, url.replace('/uploads/', ''));
  if (p.startsWith(UPLOAD_DIR)) fs.promises.unlink(p).catch(() => {});
}

module.exports = { UPLOAD_DIR, uploader, publicUrl, removeFile };
