export default async () => {
  try {
    const { default: s3Client } = await import('../../src/config/s3.js');
    if (s3Client && typeof s3Client.destroy === 'function') {
      s3Client.destroy();
    }
  } catch {
  }
};
