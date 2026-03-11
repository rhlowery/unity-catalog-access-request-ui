import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditIntegrityManager } from '../services/audit/AuditIntegrityManager';
import { WebCrypto } from '../services/crypto/WebCryptoService';
import type { AuditEntry } from '../services/audit/AuditTypes';

vi.mock('../services/crypto/WebCryptoService', () => ({
    WebCrypto: {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        generateHash: vi.fn(),
    }
}));

describe('AuditIntegrityManager', () => {
    let manager: AuditIntegrityManager;
    let mockEntry: AuditEntry;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new AuditIntegrityManager();
        mockEntry = {
            id: '123',
            timestamp: '2023-01-01T00:00:00Z',
            type: 'SECURITY',
            actor: 'user1',
            action: 'LOGIN',
            target: 'system'
        };
    });

    it('should sign an entry successfully', async () => {
        vi.mocked(WebCrypto.encrypt).mockResolvedValue('encrypted-signature');
        const signature = await manager.signEntry(mockEntry);
        expect(signature).toBe('encrypted-signature');
        expect(WebCrypto.encrypt).toHaveBeenCalled();
    });

    it('should return empty string if signatures disabled', async () => {
        manager = new AuditIntegrityManager({ enableDigitalSignatures: false });
        const signature = await manager.signEntry(mockEntry);
        expect(signature).toBe('');
        expect(WebCrypto.encrypt).not.toHaveBeenCalled();
    });

    it('should verify a valid entry', async () => {
        mockEntry.signature = 'encrypted-signature';
        vi.mocked(WebCrypto.decrypt).mockResolvedValue('123|2023-01-01T00:00:00Z|SECURITY|user1|LOGIN|system|{}');
        const isValid = await manager.verifyEntry(mockEntry);
        expect(isValid).toBe(true);
    });

    it('should fail verification for tampered entry', async () => {
        mockEntry.signature = 'encrypted-signature';
        vi.mocked(WebCrypto.decrypt).mockResolvedValue('tampered-data');
        const isValid = await manager.verifyEntry(mockEntry);
        expect(isValid).toBe(false);
    });

    it('should calculate hash', async () => {
        vi.mocked(WebCrypto.generateHash).mockResolvedValue('hashed-value');
        const hash = await manager.calculateHash(mockEntry);
        expect(hash).toBe('hashed-value');
        expect(WebCrypto.generateHash).toHaveBeenCalled();
    });

    it('should chain entries', async () => {
        const prevEntry: AuditEntry = { ...mockEntry, id: '122', hash: 'prev-hash' };
        vi.mocked(WebCrypto.generateHash).mockResolvedValue('new-hash');
        await manager.chainEntries(prevEntry, mockEntry);
        expect(mockEntry.previousHash).toBe('prev-hash');
        expect(mockEntry.hash).toBe('new-hash');
    });

    it('should detect tampering in chain', async () => {
        const entries: AuditEntry[] = [
            { ...mockEntry, id: '1', hash: 'hash1' },
            { ...mockEntry, id: '2', previousHash: 'hash1', hash: 'hash2' },
            { ...mockEntry, id: '3', previousHash: 'tampered', hash: 'hash3' },
        ];
        // Disabled signatures for this test to just test hash chaining
        manager = new AuditIntegrityManager({ enableDigitalSignatures: false });
        const result = await manager.detectTampering(entries);
        expect(result.tampered).toBe(true);
        expect(result.tamperedEntries).toContain('3');
    });

    it('should get a fully signed entry', async () => {
        vi.mocked(WebCrypto.generateHash).mockResolvedValue('hashed-value');
        vi.mocked(WebCrypto.encrypt).mockResolvedValue('encrypted-signature');
        const signed = await manager.getSignedEntry(mockEntry);
        expect(signed.hash).toBe('hashed-value');
        expect(signed.signature).toBe('encrypted-signature');
    });
});
