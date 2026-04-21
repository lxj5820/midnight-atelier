import { DB_NAME, DB_VERSION, STORE_NAME } from './constants';
import type { GenerationRecord } from '../types/generation';
import type { MenuItemId } from '../menuConfig';

/**
 * 打开 IndexedDB 数据库连接
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 获取所有生成记录
 */
export async function getAllGenerationRecords(): Promise<GenerationRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to get generation records:', error);
    return [];
  }
}

/**
 * 保存生成记录到数据库
 */
export async function saveGenerationRecordToDB(record: GenerationRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 从数据库删除生成记录
 */
export async function deleteGenerationRecordFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 清空生成历史记录
 */
export async function clearGenerationHistoryFromDB(type?: MenuItemId): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (type) {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        (getAllRequest.result as GenerationRecord[])
          .filter(r => r.type === type)
          .forEach(r => store.delete(r.id));
      };
    } else {
      store.clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 异步获取生成历史
 */
export async function getGenerationHistoryAsync(): Promise<GenerationRecord[]> {
  try {
    return await getAllGenerationRecords();
  } catch {
    return [];
  }
}

/**
 * 按类型获取生成历史
 */
export async function getGenerationHistoryByTypeAsync(type: MenuItemId): Promise<GenerationRecord[]> {
  const history = await getGenerationHistoryAsync();
  return history.filter(h => h.type === type);
}

// 统一的数据库操作封装，提供更好的错误处理
export const dbOperations = {
  async save(record: GenerationRecord): Promise<boolean> {
    try {
      await saveGenerationRecordToDB(record);
      return true;
    } catch (error) {
      console.error('dbOperations.save failed:', error);
      return false;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteGenerationRecordFromDB(id);
      return true;
    } catch (error) {
      console.error('dbOperations.delete failed:', error);
      return false;
    }
  },

  async getAll(): Promise<GenerationRecord[]> {
    try {
      return await getAllGenerationRecords();
    } catch (error) {
      console.error('dbOperations.getAll failed:', error);
      return [];
    }
  },

  async clear(type?: MenuItemId): Promise<boolean> {
    try {
      await clearGenerationHistoryFromDB(type);
      return true;
    } catch (error) {
      console.error('dbOperations.clear failed:', error);
      return false;
    }
  },
};
