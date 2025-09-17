class ApiKeyManager {
    private readonly KEYS_STORAGE_KEY = 'gemini_api_keys';
    private readonly ACTIVE_KEY_INDEX_KEY = 'gemini_active_key_index';

    private keys: string[] = [];
    private activeIndex: number = 0;

    constructor() {
        this.loadKeys();
    }

    private loadKeys() {
        try {
            const storedKeys = localStorage.getItem(this.KEYS_STORAGE_KEY);
            const storedIndex = localStorage.getItem(this.ACTIVE_KEY_INDEX_KEY);
            
            this.keys = storedKeys ? JSON.parse(storedKeys) : [];
            this.activeIndex = storedIndex ? parseInt(storedIndex, 10) : 0;

            if (this.activeIndex >= this.keys.length) {
                this.activeIndex = 0;
                this.save();
            }

        } catch (error) {
            console.error("Failed to load API keys from localStorage:", error);
            this.keys = [];
            this.activeIndex = 0;
        }
    }

    private save() {
        localStorage.setItem(this.KEYS_STORAGE_KEY, JSON.stringify(this.keys));
        localStorage.setItem(this.ACTIVE_KEY_INDEX_KEY, this.activeIndex.toString());
    }

    getAllKeys(): string[] {
        return [...this.keys];
    }

    getActiveKey(): string | null {
        return this.keys[this.activeIndex] || null;
    }

    addKey(key: string): boolean {
        if (!this.keys.includes(key)) {
            this.keys.push(key);
            // If it's the first key being added, make it active
            if (this.keys.length === 1) {
                this.activeIndex = 0;
            }
            this.save();
            return true;
        }
        return false;
    }

    removeKey(keyToRemove: string): void {
        const indexToRemove = this.keys.indexOf(keyToRemove);
        if (indexToRemove > -1) {
            this.keys.splice(indexToRemove, 1);
            
            // Adjust active index if necessary
            if (this.activeIndex >= indexToRemove) {
                 this.activeIndex = Math.max(0, this.activeIndex - 1);
            }
            
            if (this.activeIndex >= this.keys.length) {
                 this.activeIndex = 0;
            }

            this.save();
        }
    }

    setActiveKey(key: string): boolean {
        const index = this.keys.indexOf(key);
        if (index > -1) {
            this.activeIndex = index;
            this.save();
            return true;
        }
        return false;
    }

    switchToNextKey(): void {
        if (this.keys.length > 0) {
            this.activeIndex = (this.activeIndex + 1) % this.keys.length;
            this.save();
        }
    }
}

export const apiKeyManager = new ApiKeyManager();
