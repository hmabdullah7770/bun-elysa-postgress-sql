// src/utils/progressStore.ts

// Simple in-memory store (use Redis in production)
class ProgressStore {
  private store = new Map<string, any>();

  set(key: string, value: any) {
    this.store.set(key, value);
  }

  get(key: string) {
    return this.store.get(key);
  }

  delete(key: string) {
    return this.store.delete(key);
  }
}

export const progressStore = new ProgressStore();