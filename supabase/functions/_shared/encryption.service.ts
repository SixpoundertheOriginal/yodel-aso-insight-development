/**
 * Encryption Service for Dashboard AI Chat
 *
 * Provides AES-GCM encryption/decryption for chat message content.
 * Uses a global encryption key stored in Supabase secrets.
 *
 * Security Features:
 * - AES-GCM 256-bit encryption
 * - Unique IV (Initialization Vector) per message
 * - Base64 encoding for storage
 * - Server-side only (never exposed to frontend)
 *
 * Usage:
 * ```typescript
 * const encrypted = await EncryptionService.encrypt('Hello, world!');
 * const decrypted = await EncryptionService.decrypt(encrypted);
 * ```
 */

export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96-bit IV for AES-GCM

  /**
   * Retrieves or imports the encryption key from environment
   */
  private static async getOrCreateKey(): Promise<CryptoKey> {
    const keyBase64 = Deno.env.get('CHAT_ENCRYPTION_KEY');

    if (!keyBase64) {
      throw new Error(
        'CHAT_ENCRYPTION_KEY not configured in Supabase secrets. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }

    try {
      // Decode base64 key to Uint8Array
      const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

      // Import as CryptoKey for Web Crypto API
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.ALGORITHM },
        false, // Not extractable
        ['encrypt', 'decrypt']
      );

      return key;
    } catch (error) {
      throw new Error(
        `Failed to import encryption key: ${error.message}. ` +
        'Ensure CHAT_ENCRYPTION_KEY is valid base64.'
      );
    }
  }

  /**
   * Encrypts plaintext message content
   *
   * @param plaintext - Message content to encrypt
   * @returns Base64-encoded string: "iv:ciphertext"
   */
  public static async encrypt(plaintext: string): Promise<string> {
    try {
      const key = await this.getOrCreateKey();

      // Generate random IV (must be unique per message)
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encode plaintext to bytes
      const encoder = new TextEncoder();
      const plaintextBytes = encoder.encode(plaintext);

      // Encrypt using AES-GCM
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        plaintextBytes
      );

      // Convert IV and ciphertext to base64
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const encryptedBase64 = btoa(
        String.fromCharCode(...new Uint8Array(encryptedBuffer))
      );

      // Return as "iv:ciphertext" format
      return `${ivBase64}:${encryptedBase64}`;
    } catch (error) {
      console.error('[EncryptionService] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts encrypted message content
   *
   * @param ciphertext - Base64-encoded encrypted string ("iv:ciphertext")
   * @returns Decrypted plaintext message
   */
  public static async decrypt(ciphertext: string): Promise<string> {
    try {
      const key = await this.getOrCreateKey();

      // Split IV and ciphertext
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid ciphertext format. Expected "iv:ciphertext"');
      }

      const [ivBase64, encryptedBase64] = parts;

      // Decode from base64
      const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
      const encryptedBytes = Uint8Array.from(
        atob(encryptedBase64),
        c => c.charCodeAt(0)
      );

      // Decrypt using AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encryptedBytes
      );

      // Decode bytes to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('[EncryptionService] Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Validates that encryption/decryption is working correctly
   * Useful for testing during deployment
   */
  public static async validateSetup(): Promise<boolean> {
    try {
      const testMessage = 'Dashboard AI Chat encryption test';
      const encrypted = await this.encrypt(testMessage);
      const decrypted = await this.decrypt(encrypted);

      if (decrypted !== testMessage) {
        throw new Error('Encryption validation failed: decrypted text mismatch');
      }

      console.log('✅ [EncryptionService] Setup validated successfully');
      return true;
    } catch (error) {
      console.error('❌ [EncryptionService] Setup validation failed:', error);
      return false;
    }
  }
}
