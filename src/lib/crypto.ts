import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const IV_LENGTH = 12;

function getEncryptionKey() {
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");

  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }

  return key;
}

export function encryptSecret(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [ivSegment, authTagSegment, encryptedSegment] = payload.split(".");

  if (!ivSegment || !authTagSegment || !encryptedSegment) {
    throw new Error("Encrypted token payload is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivSegment, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(authTagSegment, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedSegment, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}