const DB_NAME = 'darakwon_attendance';
const DB_VERSION = 1;
let db = null;
let fallbackStorage = {};

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.warn('IndexedDB 사용 불가, 메모리 저장소 사용 중');
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('DB 열기 실패');
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('attendances')) {
        db.createObjectStore('attendances', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function saveAttendance(date, data) {
  if (db) {
    const tx = db.transaction('attendances', 'readwrite');
    tx.objectStore('attendances').put({ date, ...data });
    return tx.complete;
  } else {
    fallbackStorage[date] = { ...data };
  }
}

async function getAttendance(date) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction('attendances', 'readonly');
      const req = tx.objectStore('attendances').get(date);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } else {
    return fallbackStorage[date] || null;
  }
}

async function getAllAttendances() {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction('attendances', 'readonly');
      const store = tx.objectStore('attendances');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  } else {
    return Object.entries(fallbackStorage).map(([date, data]) => ({ date, ...data }));
  }
}

async function deleteOldRecords(currentWeekDates, lastWeekDates) {
  const keep = [...currentWeekDates, ...lastWeekDates];
  if (db) {
    const tx = db.transaction('attendances', 'readwrite');
    const store = tx.objectStore('attendances');
    const req = store.getAllKeys();
    req.onsuccess = () => {
      req.result.forEach(key => {
        if (!keep.includes(key)) store.delete(key);
      });
    };
  } else {
    Object.keys(fallbackStorage).forEach(key => {
      if (!keep.includes(key)) delete fallbackStorage[key];
    });
  }
}

export { openDB, saveAttendance, getAttendance, getAllAttendances, deleteOldRecords };
