// src/utils/generateId.ts

const ALPHABET = 
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generateId = {
  
  // For users, posts, comments (21 chars)
  public: () => {
    const bytes = crypto.getRandomValues(new Uint8Array(21));
    return Array.from(bytes)
      .map(b => ALPHABET[b % ALPHABET.length])
      .join('');
  },

  // For short URLs (12 chars)
  short: () => {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return Array.from(bytes)
      .map(b => ALPHABET[b % ALPHABET.length])
      .join('');
  },

  // For sortable IDs (timestamp + random)
  sortable: () => {
    const timestamp = Date.now().toString(36);
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const random = Array.from(bytes)
      .map(b => ALPHABET[b % ALPHABET.length])
      .join('');
    return `${timestamp}${random}`;
  },
};

// Usage:
// generateId.public()   → "V1StGXR8ZjdHi6BmyTV1S"
// generateId.short()    → "V1StGXR8_Z5j"
// generateId.sortable() → "lx3k9zV1StGXR8"