
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const required = [
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta configurar la variable ${key}`);
  }
}

export const r2 = new S3Client({
  region: process.env.B2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME;

export {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  getSignedUrl
};
