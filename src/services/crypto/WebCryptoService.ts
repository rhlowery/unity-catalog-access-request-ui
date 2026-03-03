import { Base64 } from 'js-base64';

export interface WebCryptoConfig {
  keyDerivation: 'PBKDF2' | 'HKDF';
  iterations: number;
  saltLength: number;
}

export interface CryptoService {
  encrypt(data: string, key?: string): Promise<string>;
  decrypt(encodedData: string, key?: string): Promise<string>;
  generateKey(algorithm?: string, extractable?: boolean): Promise<CryptoKey>;
  generateHash(data: string, algorithm?: string): Promise<string>;
}

export class WebCryptoService implements CryptoService {
  private config: WebCryptoConfig;
  private algorithm: string = 'AES-GCM';
  private keyLength: number = 256;

  constructor(config: Partial<WebCryptoConfig> = {}) {
    this.config = {
      keyDerivation: 'PBKDF2',
      iterations: 100000,
      saltLength: 32,
      ...config
    };
  }

  private async getCryptoKey(password?: string): Promise<CryptoKey> {
    if (password) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(password);

      const salt = encoder.encode('ACS_PERMANENT_SALT');

      const keyMaterial = await crypto.subtle.importKey(
        'raw', keyData, { name: 'PBKDF2' }, false, ['deriveKey']
      );

      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', iterations: this.config.iterations, salt: salt },
        keyMaterial, { name: this.algorithm, length: this.keyLength }, false, ['encrypt', 'decrypt']
      );
    }

    // Dynamic key logic (never hardcoded)
    let exportedKey = sessionStorage.getItem('acs_encryption_key');
    if (!exportedKey) {
      const newKey = await crypto.subtle.generateKey(
        { name: this.algorithm, length: this.keyLength },
        true,
        ['encrypt', 'decrypt']
      );
      const raw = await crypto.subtle.exportKey('raw', newKey);
      exportedKey = Base64.fromUint8Array(new Uint8Array(raw));
      sessionStorage.setItem('acs_encryption_key', exportedKey);
      return newKey;
    }

    const raw = Base64.toUint8Array(exportedKey);
    return crypto.subtle.importKey(
      'raw', raw, this.algorithm, false, ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts the provided data using AES-GCM.
   *
   * @param {string} data - The plain text string to encrypt.
   * @param {string} [key] - Optional password to derive the encryption key. If omitted, uses the dynamic session key.
   * @returns {Promise<string>} A promise that resolves to the Base64-encoded encrypted data, including the IV.
   * @throws {Error} If the encryption process fails.
   */
  async encrypt(data: string, key?: string): Promise<string> {
    try {
      const cryptoKey = await this.getCryptoKey(key);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12)) as any;

      const encrypted = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        cryptoKey,
        dataBuffer
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return Base64.fromUint8Array(combined);
    } catch (error: any) {
      console.error('[WebCryptoService] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  async decrypt(encodedData: string, key?: string): Promise<string> {
    try {
      const cryptoKey = await this.getCryptoKey(key);
      const combined = Base64.toUint8Array(encodedData);

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        cryptoKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error: any) {
      console.error('[WebCryptoService] Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: this.algorithm, length: this.keyLength },
      true,
      ['encrypt', 'decrypt']
    );
  }

  async generateHash(data: string, algorithm?: string): Promise<string> {
    try {
      const hashAlgo = algorithm || 'SHA-256';
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest(hashAlgo, dataBuffer);
      return Base64.fromUint8Array(new Uint8Array(hashBuffer));
    } catch (error: any) {
      console.error('[WebCryptoService] Hash generation failed:', error);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }
}

export const WebCrypto = new WebCryptoService();