import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebCryptoService } from '../services/crypto/WebCryptoService';

describe('WebCryptoService', () => {
    let service: WebCryptoService;

    beforeEach(() => {
        // Clear session storage before each test
        sessionStorage.clear();
        service = new WebCryptoService();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should encrypt and decrypt data with an explicit key', async () => {
        const plainText = 'sensitive information 123 !@#';
        const password = 'my-super-secret-password';

        const encryptedData = await service.encrypt(plainText, password);
        expect(encryptedData).toBeDefined();
        expect(encryptedData).not.toEqual(plainText);
        expect(typeof encryptedData).toBe('string');

        const decryptedData = await service.decrypt(encryptedData, password);
        expect(decryptedData).toEqual(plainText);
    });

    it('should fail to decrypt with the wrong key', async () => {
        const plainText = 'sensitive data';
        const encryptedData = await service.encrypt(plainText, 'correct-password');

        await expect(service.decrypt(encryptedData, 'wrong-password')).rejects.toThrow();
    });

    it('should encrypt and decrypt using dynamic session key when explicit key is omitted', async () => {
        const plainText = 'data for dynamic key';

        // First encryption should generate and store the key in sessionStorage
        const encryptedData = await service.encrypt(plainText);
        expect(encryptedData).toBeDefined();

        // Verify key was stored
        expect(sessionStorage.getItem('acs_encryption_key')).not.toBeNull();

        const decryptedData = await service.decrypt(encryptedData);
        expect(decryptedData).toEqual(plainText);
    });

    it('should generate a hash that is consistent for the same input', async () => {
        const input = 'test-hash-input';
        const hash1 = await service.generateHash(input);
        const hash2 = await service.generateHash(input);

        expect(hash1).toBeDefined();
        expect(hash1).toEqual(hash2);

        // Ensure it uses a different hash for different inputs
        const hash3 = await service.generateHash(input + 'diff');
        expect(hash3).not.toEqual(hash1);
    });

    it('should generate a new random CryptoKey', async () => {
        const key = await service.generateKey();
        expect(key).toBeDefined();
        expect(key.type).toBe('secret');
    });
});
