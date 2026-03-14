import { describe, it, expect } from 'vitest';
import {
  generateFileHash,
  generateStringHash,
  compareHashes,
  generateSecureToken,
  generateWebhookSignature,
  verifyWebhookSignature,
} from '@/lib/crypto';

describe('crypto utilities', () => {
  describe('generateFileHash', () => {
    it('should return a 64-char hex string for a buffer', () => {
      const buf = Buffer.from('hello world');
      const hash = generateFileHash(buf);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should return consistent hash for same content', () => {
      const buf = Buffer.from('test content');
      expect(generateFileHash(buf)).toBe(generateFileHash(buf));
    });

    it('should return different hashes for different content', () => {
      expect(generateFileHash(Buffer.from('a'))).not.toBe(
        generateFileHash(Buffer.from('b'))
      );
    });
  });

  describe('generateStringHash', () => {
    it('should hash a string to SHA-256 hex', () => {
      const hash = generateStringHash('docvault');
      expect(hash).toHaveLength(64);
    });
  });

  describe('compareHashes', () => {
    it('should return true for equal hashes', () => {
      const hash = generateStringHash('same');
      expect(compareHashes(hash, hash)).toBe(true);
    });

    it('should return false for different hashes', () => {
      const h1 = generateStringHash('one');
      const h2 = generateStringHash('two');
      expect(compareHashes(h1, h2)).toBe(false);
    });

    it('should return false for mismatched length hashes', () => {
      expect(compareHashes('abc', 'abcdef')).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should return a hex string of expected length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      expect(generateSecureToken()).not.toBe(generateSecureToken());
    });
  });

  describe('webhook signature', () => {
    const secret = 'super-secret';
    const payload = JSON.stringify({ event: 'document.created' });

    it('should generate a HMAC-SHA256 signature', () => {
      const sig = generateWebhookSignature(payload, secret);
      expect(sig).toHaveLength(64);
    });

    it('should verify a valid signature', () => {
      const sig = generateWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, sig, secret)).toBe(true);
    });

    it('should reject a tampered payload', () => {
      const sig = generateWebhookSignature(payload, secret);
      const tampered = JSON.stringify({ event: 'document.deleted' });
      expect(verifyWebhookSignature(tampered, sig, secret)).toBe(false);
    });

    it('should reject a wrong secret', () => {
      const sig = generateWebhookSignature(payload, secret);
      expect(verifyWebhookSignature(payload, sig, 'wrong-secret')).toBe(false);
    });
  });
});
