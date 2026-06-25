/**
 * Audio helper utilities for PCM16 conversion and base64 operations.
 */

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function float32ToPcm16(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    // Scale to 16-bit signed integer
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(i * 2, val, true); // true for little-endian
  }
  return buffer;
}

export function pcm16ToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
  const view = new DataView(arrayBuffer);
  const len = arrayBuffer.byteLength / 2;
  const float32 = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const val = view.getInt16(i * 2, true); // little-endian
    float32[i] = val / 32768;
  }
  return float32;
}
