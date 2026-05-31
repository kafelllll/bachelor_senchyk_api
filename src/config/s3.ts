import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3Config: S3ClientConfig = {};

if (region) {
  s3Config.region = region;
}

if (accessKeyId && secretAccessKey) {
  s3Config.credentials = {
    accessKeyId,
    secretAccessKey,
  };
}

const s3Client = new S3Client(s3Config);

export default s3Client;
