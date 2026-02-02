export interface WebCryptoConfig {
  keyDerivation: 'PBKDF2' | 'HKDF';
  iterations: number;
  saltLength: number;
}

export interface CryptoService {
  encrypt(data: string, key?: string): Promise<{ encrypted: string; iv: string }>;
  decrypt(encryptedData: string, key?: string): Promise<string>;
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

  private generateSalt(): string {
    const array = new Uint8Array(this.config.saltLength);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  private async importKey(key: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const salt = encoder.encode(this.generateSalt());
    const keyData = encoder.encode(key);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        iterations: this.config.iterations,
        salt: salt,
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: string, key?: string): Promise<{ encrypted: string; iv: string }> {
    try {
      const cryptoKey = key ? 
        await this.importKey(key) : 
        await this.generateKey();

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        cryptoKey,
          dataBuffer
      );

      const encryptedArray = new Uint8Array(encrypted);
      
      return {
        encrypted: btoa(String.fromCharCode(...encryptedArray)),
        iv: btoa(String.fromCharCode(...iv))
      };
    } catch (error) {
      console.error('[WebCryptoService] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  async decrypt(encryptedData: string, key?: string): Promise<string> {
    try {
      const cryptoKey = key ? 
        await this.importKey(key) : 
        await this.generateKey();

      const encryptedArray = atob(encryptedData);
      const ivString = encryptedData.substring(encryptedData.indexOf(',') + 1);
      const ivArray = atob(ivString);
      
      const encrypted = new Uint8Array(encryptedArray.length);
      for (let i = 0; i < encrypted.length; i++) {
        encrypted[i] = encryptedArray.charCodeAt(i);
      }
      
      const iv = new Uint8Array(ivArray.length);
      for (let i = 0; i < ivArray.length; i++) {
        iv[i] = ivArray.charCodeAt(i);
      }

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        cryptoKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('[WebCryptoService] Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength,
      },
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
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      
      return btoa(String.fromCharCode(...hashArray));
    } catch (error) {
      console.error('[WebCryptoService] Hash generation failed:', error);
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }
}