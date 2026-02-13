import { Cacheable } from 'cacheable';

const cacheable = new Cacheable();

class LocalCache {
    private cache: Cacheable;

    constructor() {
        this.cache = new Cacheable();
    }

    async setLimited(key: string, until: Date) {
        const ttlMs = until.getTime() - Date.now();
        console.log('setting limited until', key, ttlMs);
        await this.cache.set<number>(key, until.getTime(), ttlMs);
    }

    async getLimited(key: string) {
        const limitedUntil = await this.cache.get<number>(key);

        if (!limitedUntil)
            return null;

        if (limitedUntil < Date.now()) {
            console.log('limited until expired', key);
            await this.cache.delete(key);
            return null;
        }

        console.log('is limited:', key, limitedUntil)
        return new Date(limitedUntil);
    }
}

const localCache = new LocalCache();

export { localCache };
