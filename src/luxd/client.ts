/**
 * LuxFHE Client - Connects to lux/tfhe Go server
 * 
 * Endpoints:
 * - GET  /publickey - Fetch public key
 * - POST /encrypt   - Encrypt value with public key
 * - POST /evaluate  - Evaluate FHE operation
 * - POST /decrypt   - Decrypt (standard mode)
 * - GET  /health    - Health check
 */

export interface LuxFHEConfig {
  /** FHE server URL (default: http://localhost:8545/fhe) */
  serverUrl: string;
  /** Threshold mode flag */
  thresholdMode?: boolean;
}

export interface EncryptRequest {
  value: number | bigint;
  bitWidth: 4 | 8 | 16 | 32 | 64 | 128 | 160 | 256;
}

export interface EvaluateRequest {
  op: 'add' | 'sub' | 'eq' | 'lt' | 'gt' | 'and' | 'or' | 'xor';
  left: Uint8Array;
  right?: Uint8Array;
  bitWidth: number;
}

export interface HealthResponse {
  status: string;
  threshold: boolean;
  parties: number;
}

export class LuxFHEClient {
  private serverUrl: string;
  private thresholdMode: boolean;
  private publicKey: Uint8Array | null = null;

  constructor(config: LuxFHEConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.thresholdMode = config.thresholdMode ?? false;
  }

  /**
   * Check server health
   */
  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.serverUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  /**
   * Fetch public key from server
   */
  async getPublicKey(): Promise<Uint8Array> {
    if (this.publicKey) return this.publicKey;

    const res = await fetch(`${this.serverUrl}/publickey`);
    if (!res.ok) throw new Error(`Failed to fetch public key: ${res.status}`);

    const buffer = await res.arrayBuffer();
    this.publicKey = new Uint8Array(buffer);
    return this.publicKey;
  }

  /**
   * Encrypt a value using server's public key
   */
  async encrypt(req: EncryptRequest): Promise<Uint8Array> {
    const res = await fetch(`${this.serverUrl}/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: typeof req.value === 'bigint' ? Number(req.value) : req.value,
        bitWidth: req.bitWidth,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Encryption failed: ${text}`);
    }

    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Evaluate FHE operation on encrypted values
   */
  async evaluate(req: EvaluateRequest): Promise<Uint8Array> {
    const res = await fetch(`${this.serverUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        op: req.op,
        left: Array.from(req.left),
        right: req.right ? Array.from(req.right) : undefined,
        bitWidth: req.bitWidth,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Evaluation failed: ${text}`);
    }

    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Request decryption (threshold mode uses /threshold/decrypt)
   */
  async decrypt(ciphertext: Uint8Array): Promise<bigint> {
    const endpoint = this.thresholdMode
      ? `${this.serverUrl}/threshold/decrypt`
      : `${this.serverUrl}/decrypt`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: ciphertext,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Decryption failed: ${text}`);
    }

    const data = await res.json();
    return BigInt(data.value);
  }

  /**
   * Verify ZK proof of FHE computation
   */
  async verify(proof: Uint8Array): Promise<boolean> {
    const res = await fetch(`${this.serverUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: proof,
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.verified === true;
  }
}

/**
 * Create LuxFHE client with default configuration
 */
export function createLuxFHEClient(
  serverUrl = 'https://fhe.lux.network',
  thresholdMode = false
): LuxFHEClient {
  return new LuxFHEClient({ serverUrl, thresholdMode });
}

/**
 * FHE integer types supported by luxd
 */
export enum FheUintType {
  FheUint4 = 4,
  FheUint8 = 8,
  FheUint16 = 16,
  FheUint32 = 32,
  FheUint64 = 64,
  FheUint128 = 128,
  FheUint160 = 160,
  FheUint256 = 256,
}

/**
 * Encrypted integer wrapper
 */
export class EncryptedUint {
  constructor(
    public readonly data: Uint8Array,
    public readonly bitWidth: number
  ) {}

  toBytes(): Uint8Array {
    return this.data;
  }

  static fromBytes(data: Uint8Array, bitWidth: number): EncryptedUint {
    return new EncryptedUint(data, bitWidth);
  }
}
