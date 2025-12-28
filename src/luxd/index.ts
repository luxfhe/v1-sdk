/**
 * LuxFHE - Lux FHE Server Client
 * 
 * Standard TFHE mode (single-key encryption)
 * For threshold mode, use @luxfhe/v2-sdk
 */

export {
  LuxFHEClient,
  createLuxFHEClient,
  FheUintType,
  EncryptedUint,
  type LuxFHEConfig,
  type EncryptRequest,
  type EvaluateRequest,
  type HealthResponse,
} from './client';

// Default export for convenience
export { createLuxFHEClient as default } from './client';
