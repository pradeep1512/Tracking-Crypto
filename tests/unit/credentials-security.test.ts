import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExchangeCredentialService } from '../../src/services/ExchangeCredentialService';

describe('ExchangeCredentialService & Security', () => {
  const service = new ExchangeCredentialService();

  it('successfully encrypts and decrypts secrets with AES-256-GCM', () => {
    const originalSecret = 'super_secret_binance_api_key_value_987654321';
    const encrypted = service.encrypt(originalSecret);

    assert.ok(encrypted.ciphertext.length > 0);
    assert.ok(encrypted.iv.length === 24); // 12 bytes = 24 hex chars
    assert.ok(encrypted.tag.length === 32); // 16 bytes = 32 hex chars
    assert.notEqual(encrypted.ciphertext, originalSecret);

    const decrypted = service.decrypt(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    assert.equal(decrypted, originalSecret);
  });

  it('fails decryption if ciphertext has been tampered with (GCM authentication check)', () => {
    const originalSecret = 'test_tamper_detection_secret_abc123';
    const encrypted = service.encrypt(originalSecret);

    // Tamper with the ciphertext (flip a character)
    const tamperedCiphertext =
      (encrypted.ciphertext[0] === 'a' ? 'b' : 'a') + encrypted.ciphertext.slice(1);

    assert.throws(
      () => {
        service.decrypt(tamperedCiphertext, encrypted.iv, encrypted.tag);
      },
      /Unsupported state or unable to authenticate data|bad decrypt/i
    );
  });

  it('fails decryption if authentication tag has been tampered with', () => {
    const originalSecret = 'test_tamper_auth_tag_123';
    const encrypted = service.encrypt(originalSecret);

    // Tamper with auth tag
    const tamperedTag = (encrypted.tag[0] === '0' ? '1' : '0') + encrypted.tag.slice(1);

    assert.throws(
      () => {
        service.decrypt(encrypted.ciphertext, encrypted.iv, tamperedTag);
      },
      /Unsupported state or unable to authenticate data|bad decrypt/i
    );
  });

  it('masks API keys securely while preserving first 4 and last 4 characters', () => {
    const key = 'abcdef1234567890ghijkl';
    const masked = service.maskApiKey(key);

    assert.equal(masked, 'abcd••••••••ijkl');
    assert.ok(!masked.includes('1234567890'));
  });

  it('masks short API keys completely', () => {
    const shortKey = '1234567';
    const masked = service.maskApiKey(shortKey);

    assert.equal(masked, '••••••••');
  });
});
