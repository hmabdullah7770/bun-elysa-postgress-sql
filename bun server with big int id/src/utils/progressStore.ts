class ProgressStore<T = unknown> {
	private store: Map<string, T>;

	constructor() {
		this.store = new Map();
	}

	set(key: string, value: T): void {
		this.store.set(key, value);
	}

	get(key: string): T | undefined {
		return this.store.get(key);
	}

	delete(key: string): void {
		this.store.delete(key);
	}
}

export const progressStore = new ProgressStore();