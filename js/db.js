/**
 * 데이터베이스 관리 모듈
 * IndexedDB와 localStorage 관리 및 폴백 메커니즘 제공
 */
const DB = (() => {
    // IndexedDB 데이터베이스 이름 및 버전
    const DB_NAME = 'darakwonAttendanceDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'attendance';
    
    // 메모리 스토리지 (LocalStorage 및 IndexedDB가 사용 불가능한 경우)
    let memoryStorage = {};
    
    // 스토리지 가용성 상태
    let storageStatus = {
        indexedDB: false,
        localStorage: false
    };
    
    // IndexedDB 인스턴스
    let db = null;
    
    /**
     * IndexedDB 초기화
     * @returns {Promise} 초기화 완료 시 resolve
     */
    const initIndexedDB = () => {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB를 지원하지 않는 브라우저입니다.');
                storageStatus.indexedDB = false;
                resolve(false);
                return;
            }
            
            const request = window.indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('IndexedDB 연결 오류:', event.target.error);
                storageStatus.indexedDB = false;
                resolve(false);
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                storageStatus.indexedDB = true;
                console.log('IndexedDB 연결 성공');
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'date' });
                    
                    // 인덱스 생성
                    objectStore.createIndex('date', 'date', { unique: true });
                    objectStore.createIndex('weekNumber', 'weekNumber', { unique: false });
                    objectStore.createIndex('year', 'year', { unique: false });
                    
                    console.log('IndexedDB 스토어 생성 완료');
                }
            };
        });
    };
    
    /**
     * localStorage 가용성 체크
     * @returns {boolean} localStorage 사용 가능 여부
     */
    const checkLocalStorage = () => {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            storageStatus.localStorage = true;
            return true;
        } catch (e) {
            console.warn('localStorage를 사용할 수 없습니다:', e);
            storageStatus.localStorage = false;
            return false;
        }
    };
    
    /**
     * IndexedDB에 데이터 저장
     * @param {string} date - 날짜 키 (예: '2025-05-01')
     * @param {Object} data - 저장할 데이터 객체
     * @returns {Promise} 저장 완료 시 resolve
     */
    const saveToIndexedDB = (date, data) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // 날짜 형식이 키로 사용되므로 데이터에 date 속성 추가
            data.date = date;
            
            const request = objectStore.put(data);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * IndexedDB에서 데이터 읽기
     * @param {string} date - 날짜 키 (예: '2025-05-01')
     * @returns {Promise<Object>} 조회된 데이터 객체
     */
    const getFromIndexedDB = (date) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.get(date);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * IndexedDB에서 특정 주의 데이터 읽기
     * @param {number} year - 연도
     * @param {number} weekNumber - 주차
     * @returns {Promise<Array>} 해당 주차의 데이터 배열
     */
    const getWeekDataFromIndexedDB = (year, weekNumber) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const weekIndex = objectStore.index('weekNumber');
            
            // 해당 연도, 주차에 맞는 데이터 검색
            const keyRange = IDBKeyRange.only([year, weekNumber]);
            const request = weekIndex.getAll(keyRange);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * IndexedDB에서 오래된 데이터 삭제 (이번주, 지난주 데이터만 유지)
     * @returns {Promise} 삭제 완료 시 resolve
     */
    const cleanOldDataFromIndexedDB = (currentYear, currentWeek) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            // 지난주 계산
            let lastWeek = currentWeek - 1;
            let lastWeekYear = currentYear;
            
            if (lastWeek < 1) {
                lastWeek = getWeeksInYear(currentYear - 1);
                lastWeekYear = currentYear - 1;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    const data = cursor.value;
                    
                    // 이번주나 지난주 데이터가 아니면 삭제
                    if (!(
                        (data.year === currentYear && data.weekNumber === currentWeek) || 
                        (data.year === lastWeekYear && data.weekNumber === lastWeek)
                    )) {
                        cursor.delete();
                    }
                    
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * 모든 데이터를 IndexedDB에서 가져오기
     * @returns {Promise<Array>} 모든 데이터 배열
     */
    const getAllDataFromIndexedDB = () => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * 모든 데이터를 IndexedDB에 저장 (복원 용도)
     * @param {Array} dataArray - 저장할 데이터 배열
     * @returns {Promise} 저장 완료 시 resolve
     */
    const restoreAllDataToIndexedDB = (dataArray) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('IndexedDB가 초기화되지 않았습니다.'));
                return;
            }
            
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // 모든 기존 데이터 삭제
            const clearRequest = objectStore.clear();
            
            clearRequest.onsuccess = () => {
                // 새 데이터 추가
                let completed = 0;
                
                dataArray.forEach((data) => {
                    const request = objectStore.add(data);
                    
                    request.onsuccess = () => {
                        completed++;
                        if (completed === dataArray.length) {
                            resolve();
                        }
                    };
                    
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                
                // 데이터 배열이 비어있는 경우
                if (dataArray.length === 0) {
                    resolve();
                }
            };
            
            clearRequest.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };
    
    /**
     * localStorage에 데이터 저장
     * @param {string} date - 날짜 키 (예: '2025-05-01')
     * @param {Object} data - 저장할 데이터 객체
     */
    const saveToLocalStorage = (date, data) => {
        try {
            // 기존 데이터 가져오기
            const storedData = getAttendanceFromLocalStorage();
            
            // 데이터 업데이트
            storedData[date] = data;
            
            // 저장
            localStorage.setItem('darakwonAttendance', JSON.stringify(storedData));
            return true;
        } catch (e) {
            console.error('localStorage 저장 오류:', e);
            return false;
        }
    };
    
    /**
     * localStorage에서 모든 출퇴근 데이터 가져오기
     * @returns {Object} 날짜별 출퇴근 데이터
     */
    const getAttendanceFromLocalStorage = () => {
        try {
            const data = localStorage.getItem('darakwonAttendance');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('localStorage 읽기 오류:', e);
            return {};
        }
    };
    
    /**
     * localStorage에서 오래된 데이터 삭제 (이번주, 지난주 데이터만 유지)
     * @param {number} currentYear - 현재 연도
     * @param {number} currentWeek - 현재 주차
     */
    const cleanOldDataFromLocalStorage = (currentYear, currentWeek) => {
        try {
            // 지난주 계산
            let lastWeek = currentWeek - 1;
            let lastWeekYear = currentYear;
            
            if (lastWeek < 1) {
                lastWeek = getWeeksInYear(currentYear - 1);
                lastWeekYear = currentYear - 1;
            }
            
            const storedData = getAttendanceFromLocalStorage();
            const cleanedData = {};
            
            // 이번주와 지난주 데이터만 유지
            Object.keys(storedData).forEach(date => {
                const data = storedData[date];
                
                if ((data.year === currentYear && data.weekNumber === currentWeek) || 
                    (data.year === lastWeekYear && data.weekNumber === lastWeek)) {
                    cleanedData[date] = data;
                }
            });
            
            // 정리된 데이터 저장
            localStorage.setItem('darakwonAttendance', JSON.stringify(cleanedData));
            return true;
        } catch (e) {
            console.error('localStorage 데이터 정리 오류:', e);
            return false;
        }
    };
    
    /**
     * 해당 연도의 주 수 계산
     * @param {number} year - 연도
     * @returns {number} 해당 연도의 주 수
     */
    const getWeeksInYear = (year) => {
        const d = new Date(year, 11, 31);
        const week = getWeekNumber(d)[1];
        return week === 1 ? getWeekNumber(new Date(year, 11, 24))[1] : week;
    };
    
    /**
     * 날짜에서 연도와 주차 계산
     * @param {Date} date - 날짜 객체
     * @returns {Array} [연도, 주차]
     */
    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
        return [d.getUTCFullYear(), weekNumber];
    };
    
    /**
     * 메모리 스토리지에 데이터 저장 (localStorage, IndexedDB 모두 사용 불가인 경우)
     * @param {string} date - 날짜 키
     * @param {Object} data - 저장할 데이터
     */
    const saveToMemory = (date, data) => {
        memoryStorage[date] = data;
    };
    
    /**
     * 메모리 스토리지에서 데이터 가져오기
     * @param {string} date - 날짜 키
     * @returns {Object|null} 저장된 데이터 또는 null
     */
    const getFromMemory = (date) => {
        return memoryStorage[date] || null;
    };
    
    /**
     * 메모리 스토리지에서 주차 데이터 가져오기
     * @param {number} year - 연도
     * @param {number} weekNumber - 주차
     * @returns {Array} 해당 주차의 데이터 배열
     */
    const getWeekDataFromMemory = (year, weekNumber) => {
        return Object.values(memoryStorage).filter(data => 
            data.year === year && data.weekNumber === weekNumber
        );
    };
    
    /**
     * 메모리 스토리지에서 오래된 데이터 삭제
     * @param {number} currentYear - 현재 연도
     * @param {number} currentWeek - 현재 주차
     */
    const cleanOldDataFromMemory = (currentYear, currentWeek) => {
        // 지난주 계산
        let lastWeek = currentWeek - 1;
        let lastWeekYear = currentYear;
        
        if (lastWeek < 1) {
            lastWeek = getWeeksInYear(currentYear - 1);
            lastWeekYear = currentYear - 1;
        }
        
        // 오래된 데이터 삭제
        Object.keys(memoryStorage).forEach(date => {
            const data = memoryStorage[date];
            
            if (!(
                (data.year === currentYear && data.weekNumber === currentWeek) || 
                (data.year === lastWeekYear && data.weekNumber === lastWeek)
            )) {
                delete memoryStorage[date];
            }
        });
    };
    
    /**
     * 구글 인증 정보 저장
     * @param {Object} authData - 구글 API 인증 정보
     */
    const saveGoogleAuthData = (authData) => {
        try {
            if (storageStatus.localStorage) {
                localStorage.setItem('googleAuthData', JSON.stringify(authData));
                return true;
            } else {
                // 메모리에 저장
                memoryStorage.googleAuthData = authData;
                return true;
            }
        } catch (e) {
            console.error('구글 인증 정보 저장 오류:', e);
            return false;
        }
    };
    
    /**
     * 구글 인증 정보 가져오기
     * @returns {Object|null} 구글 API 인증 정보 또는 null
     */
    const getGoogleAuthData = () => {
        try {
            if (storageStatus.localStorage) {
                const data = localStorage.getItem('googleAuthData');
                return data ? JSON.parse(data) : null;
            } else {
                // 메모리에서 가져오기
                return memoryStorage.googleAuthData || null;
            }
        } catch (e) {
            console.error('구글 인증 정보 읽기 오류:', e);
            return null;
        }
    };
    
    /**
     * 구글 드라이브 파일 ID 저장
     * @param {string} fileId - 구글 드라이브 파일 ID
     */
    const saveGoogleFileId = (fileId) => {
        try {
            if (storageStatus.localStorage) {
                localStorage.setItem('googleFileId', fileId);
                return true;
            } else {
                // 메모리에 저장
                memoryStorage.googleFileId = fileId;
                return true;
            }
        } catch (e) {
            console.error('구글 파일 ID 저장 오류:', e);
            return false;
        }
    };
    
    /**
     * 구글 드라이브 파일 ID 가져오기
     * @returns {string|null} 파일 ID 또는 null
     */
    const getGoogleFileId = () => {
        try {
            if (storageStatus.localStorage) {
                return localStorage.getItem('googleFileId');
            } else {
                // 메모리에서 가져오기
                return memoryStorage.googleFileId || null;
            }
        } catch (e) {
            console.error('구글 파일 ID 읽기 오류:', e);
            return null;
        }
    };
    
    /**
     * 공개 API - 데이터 저장
     * @param {string} date - 날짜 키 (YYYY-MM-DD 형식)
     * @param {Object} data - 저장할 데이터 객체
     * @returns {Promise} 저장 완료 시 resolve
     */
    const saveData = async (date, data) => {
        try {
            // 현재 날짜의 연도와 주차 추가
            const dateObj = new Date(date);
            const [year, weekNumber] = getWeekNumber(dateObj);
            
            data.year = year;
            data.weekNumber = weekNumber;
            
            // 저장 시도 (여러 스토리지 옵션)
            if (storageStatus.indexedDB) {
                await saveToIndexedDB(date, data);
            } else if (storageStatus.localStorage) {
                saveToLocalStorage(date, data);
            } else {
                saveToMemory(date, data);
            }
            
            return true;
        } catch (e) {
            console.error('데이터 저장 오류:', e);
            return false;
        }
    };
    
    /**
     * 공개 API - 데이터 조회
     * @param {string} date - 날짜 키 (YYYY-MM-DD 형식)
     * @returns {Promise<Object>} 조회된 데이터 객체
     */
    const getData = async (date) => {
        try {
            if (storageStatus.indexedDB) {
                return await getFromIndexedDB(date);
            } else if (storageStatus.localStorage) {
                const allData = getAttendanceFromLocalStorage();
                return allData[date] || null;
            } else {
                return getFromMemory(date);
            }
        } catch (e) {
            console.error('데이터 조회 오류:', e);
            return null;
        }
    };
    
    /**
     * 공개 API - 주차 데이터 조회
     * @param {number} year - 연도
     * @param {number} weekNumber - 주차
     * @returns {Promise<Array>} 해당 주차의 데이터 배열
     */
    const getWeekData = async (year, weekNumber) => {
        try {
            if (storageStatus.indexedDB) {
                return await getWeekDataFromIndexedDB(year, weekNumber);
            } else if (storageStatus.localStorage) {
                const allData = getAttendanceFromLocalStorage();
                return Object.values(allData).filter(data => 
                    data.year === year && data.weekNumber === weekNumber
                );
            } else {
                return getWeekDataFromMemory(year, weekNumber);
            }
        } catch (e) {
            console.error('주차 데이터 조회 오류:', e);
            return [];
        }
    };
    
    /**
     * 공개 API - 데이터 정리 (오래된 데이터 삭제)
     * @returns {Promise} 정리 완료 시 resolve
     */
    const cleanOldData = async () => {
        try {
            // 현재 날짜의 연도와 주차 계산
            const today = new Date();
            const [currentYear, currentWeek] = getWeekNumber(today);
            
            if (storageStatus.indexedDB) {
                await cleanOldDataFromIndexedDB(currentYear, currentWeek);
            } else if (storageStatus.localStorage) {
                cleanOldDataFromLocalStorage(currentYear, currentWeek);
            } else {
                cleanOldDataFromMemory(currentYear, currentWeek);
            }
            
            return true;
        } catch (e) {
            console.error('데이터 정리 오류:', e);
            return false;
        }
    };
    
    /**
     * 공개 API - 모든 데이터 가져오기 (백업용)
     * @returns {Promise<Array>} 모든 데이터 배열
     */
    const getAllData = async () => {
        try {
            if (storageStatus.indexedDB) {
                return await getAllDataFromIndexedDB();
            } else if (storageStatus.localStorage) {
                const allData = getAttendanceFromLocalStorage();
                return Object.values(allData);
            } else {
                return Object.values(memoryStorage);
            }
        } catch (e) {
            console.error('모든 데이터 조회 오류:', e);
            return [];
        }
    };
    
    /**
     * 공개 API - 모든 데이터 복원
     * @param {Array} dataArray - 복원할 데이터 배열
     * @returns {Promise} 복원 완료 시 resolve
     */
    const restoreAllData = async (dataArray) => {
        try {
            if (storageStatus.indexedDB) {
                await restoreAllDataToIndexedDB(dataArray);
            } else if (storageStatus.localStorage) {
                const formattedData = {};
                dataArray.forEach(data => {
                    formattedData[data.date] = data;
                });
                localStorage.setItem('darakwonAttendance', JSON.stringify(formattedData));
            } else {
                memoryStorage = {};
                dataArray.forEach(data => {
                    memoryStorage[data.date] = data;
                });
            }
            
            return true;
        } catch (e) {
            console.error('데이터 복원 오류:', e);
            return false;
        }
    };
    
    /**
     * 초기화 함수
     */
    const init = async () => {
        // localStorage 체크
        checkLocalStorage();
        
        // IndexedDB 초기화 시도
        await initIndexedDB();
        
        console.log('스토리지 상태:', storageStatus);
        
        // 초기화 후 오래된 데이터 정리
        await cleanOldData();
        
        return storageStatus;
    };
    
    // 공개 API
    return {
        init,
        saveData,
        getData,
        getWeekData,
        cleanOldData,
        getAllData,
        restoreAllData,
        saveGoogleAuthData,
        getGoogleAuthData,
        saveGoogleFileId,
        getGoogleFileId,
        getWeekNumber,
        getStorageStatus: () => ({ ...storageStatus })
    };
})();
습