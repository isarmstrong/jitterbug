// This is a stub implementation for Storage to satisfy module resolution errors in Pool A.
export class Storage {
    private store = new Map<string, any>();

    setItem(key: string, value: any): void {
        this.store.set(key, value);
    }

    getItem(key: string): any {
        return this.store.get(key) || null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
} 