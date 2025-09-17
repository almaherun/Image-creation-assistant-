import { Character, Story } from '../types';

const DB_NAME = 'StoryStudioDB';
const DB_VERSION = 1;
const CHARACTERS_STORE = 'characters';
const STORIES_STORE = 'stories';

let db: IDBDatabase;

export function initDB(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(true);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", request.error);
      reject("Error opening DB");
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(CHARACTERS_STORE)) {
        dbInstance.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(STORIES_STORE)) {
        dbInstance.createObjectStore(STORIES_STORE, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(true);
    };
  });
}

function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

export function getAllCharacters(): Promise<Character[]> {
  return new Promise((resolve, reject) => {
    const store = getStore(CHARACTERS_STORE, 'readonly');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function addCharacter(character: Character): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const store = getStore(CHARACTERS_STORE, 'readwrite');
    const request = store.add(character);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export function updateCharacter(character: Character): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const store = getStore(CHARACTERS_STORE, 'readwrite');
      const request = store.put(character);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
}

export function deleteCharacter(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = getStore(CHARACTERS_STORE, 'readwrite');
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
}

export function getAllStories(): Promise<Story[]> {
    return new Promise((resolve, reject) => {
      const store = getStore(STORIES_STORE, 'readonly');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
}

export function addStory(story: Story): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const store = getStore(STORIES_STORE, 'readwrite');
      const request = store.add(story);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
}

export function deleteStory(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = getStore(STORIES_STORE, 'readwrite');
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
}

export async function exportAllData(): Promise<{ characters: Character[], stories: Story[] }> {
    const characters = await getAllCharacters();
    const stories = await getAllStories();
    return { characters, stories };
}

export function importData(data: { characters: Character[], stories: Story[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARACTERS_STORE, STORIES_STORE], 'readwrite');
    
    transaction.onerror = () => {
      console.error("Import transaction error:", transaction.error);
      reject("Error during data import transaction.");
    };

    transaction.oncomplete = () => {
      resolve();
    };

    const charStore = transaction.objectStore(CHARACTERS_STORE);
    const storyStore = transaction.objectStore(STORIES_STORE);

    // Clear existing data
    charStore.clear();
    storyStore.clear();

    // Add new data
    data.characters.forEach(character => {
        if (character.id && character.name) {
            charStore.add(character);
        }
    });

    data.stories.forEach(story => {
        if (story.id && story.name) {
            storyStore.add(story);
        }
    });
  });
}
