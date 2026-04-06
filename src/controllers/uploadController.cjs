const crypto = require('crypto');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3.cjs');
const { logger } = require('../utils/logger.cjs');

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const sanitizeFileName = (baseName) => {
  const cleaned = String(baseName).replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned.length > 0 ? cleaned : 'file';
};

const getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ message: 'fileName is required' });
    }

    if (!fileType) {
      return res.status(400).json({ message: 'fileType is required' });
    }

    if (!allowedTypes.has(fileType)) {
      return res.status(400).json({ message: 'Unsupported fileType' });
    }

    if (!process.env.AWS_S3_BUCKET_NAME || !process.env.AWS_S3_PUBLIC_BASE_URL) {
      return res.status(500).json({ message: 'S3 configuration is missing' });
    }

    const ext = path.extname(fileName);
    const rawBaseName = path.basename(fileName, ext);
    const safeBaseName = sanitizeFileName(rawBaseName);
    const safeFileName = `${safeBaseName}${ext}`;
    const userId = req.user?.id || 'guest';
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const key = `announcements/${userId}/${timestamp}-${random}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return res.json({
      uploadUrl,
      key,
      fileUrl: `${process.env.AWS_S3_PUBLIC_BASE_URL}/${key}`,
    });
  } catch (error) {
    logger.error('Failed to create presigned URL', { error });
    return res.status(500).json({ message: 'Failed to create upload URL' });
  }
};

module.exports = { getUploadUrl };
