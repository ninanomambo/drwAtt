/**
 * IndexedDB를 관리하는 클래스
 */
class AttendanceDB {
    constructor() {
        this.DB_NAME = 'darakwonAttendanceDB';
        this.DB_VERSION = 1;
        this.STORE_NAME = 'attendance';
        this.SETTINGS_STORE = 'settings';
        this.db = null;
        this.isUsingMemoryStorage = false;
        this.memoryStorage = {
            attendance: {},
            settings: {}
        };
        
        // IndexedDB 초기화
        this.init();
    }
    
    /**
     * IndexedDB 초기화
     */
    async init() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 출퇴근 기록 저장소 생성
                    if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                        db.createObjectStore(this.STORE_NAME, { keyPath: 'date' });
                    }
                    
                    // 설정 저장소 생성
                    if (!db.objectStoreNames.contains(this.SETTINGS_STORE)) {
                        db.createObjectStore(this.SETTINGS_STORE, { keyPath: 'key' });
                    }
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('IndexedDB 연결 성공');
                    resolve();
                };
                
                request.onerror = (event) => {
                    console.error('IndexedDB 연결 실패:', event.target.error);
                    this.isUsingMemoryStorage = true;
                    this.showToast('데이터베이스 연결에 실패하여 메모리 저장소를 사용합니다.', 'error');
                    resolve(); // 실패해도 앱이 동작할 수 있게 함
                };
            });
        } catch (error) {
            console.error('IndexedDB 초기화 중 오류 발생:', error);
            this.isUsingMemoryStorage = true;
            this.showToast('데이터베이스 초기화에 실패하여 메모리 저장소를 사용합니다.', 'error');
        }
    }
    
    /**
     * 토스트 메시지 표시
     */
    showToast(message, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        
        // 토스트 타입 설정 (success, error)
        toast.className = 'toast';
        if (type) {
            toast.classList.add(type);
        }
        
        // 토스트 표시
        setTimeout(() => {
            toast.classList.add('show');
            
            // 진동 피드백 (지원 시)
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // 3초 후 숨김
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }, 100);
    }
    
    /**
     * IndexedDB 트랜잭션 수행
     */
    async transaction(storeName, mode, callback) {
        if (this.isUsingMemoryStorage) {
            // 메모리 저장소 사용
            return callback(this.memoryStorage[storeName]);
        }
        
        // DB 연결 대기
        if (!this.db) {
            await this.init();
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
            
            callback(store, resolve, reject);
        });
    }
    
    /**
     * 출근 시간 기록
     */
    async checkIn(date, time) {
        try {
            // 이미 출근 기록이 있는지 확인
            const existingRecord = await this.getRecord(date);
            
            if (existingRecord && existingRecord.checkIn) {
                // 이미 출근 기록이 있으면 업데이트하지 않음
                this.showToast('이미 출근 기록이 있습니다.', 'error');
                return false;
            }
            
            // 출근 기록 저장
            const record = existingRecord || { date };
            record.checkIn = time;
            
            await this.saveRecord(record);
            this.showToast('출근 시간이 기록되었습니다.', 'success');
            return true;
        } catch (error) {
            console.error('출근 기록 오류:', error);
            this.showToast('출근 시간 기록에 실패했습니다.', 'error');
            return false;
        }
    }
    
    /**
     * 퇴근 시간 기록
     */
    async checkOut(date, time) {
        try {
            // 해당 날짜의 기록 조회
            const record = await this.getRecord(date) || { date };
            
            // 퇴근 시간 업데이트
            record.checkOut = time;
            
            await this.saveRecord(record);
            this.showToast('퇴근 시간이 기록되었습니다.', 'success');
            return true;
        } catch (error) {
            console.error('퇴근 기록 오류:', error);
            this.showToast('퇴근 시간 기록에 실패했습니다.', 'error');
            return false;
        }
    }
    
    /**
     * 기록 저장
     */
    async saveRecord(record) {
        if (this.isUsingMemoryStorage) {
            this.memoryStorage.attendance[record.date] = record;
            return;
        }
        
        return this.transaction(this.STORE_NAME, 'readwrite', (store) => {
            store.put(record);
        });
    }
    
    /**
     * 특정 날짜의 기록 조회
     */
    async getRecord(date) {
        if (this.isUsingMemoryStorage) {
            return this.memoryStorage.attendance[date] || null;
        }
        
        return new Promise((resolve, reject) => {
            this.transaction(this.STORE_NAME, 'readonly', (store, _, reject) => {
                const request = store.get(date);
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            }).catch(reject);
        });
    }
    
    /**
     * 모든 기록 조회
     */
    async getAllRecords() {
        if (this.isUsingMemoryStorage) {
            return Object.values(this.memoryStorage.attendance);
        }
        
        return new Promise((resolve, reject) => {
            const records = [];
            
            this.transaction(this.STORE_NAME, 'readonly', (store, _, reject) => {
                const request = store.openCursor();
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        records.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(records);
                    }
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            }).catch(reject);
        });
    }
    
    /**
     * 특정 기간의 기록 조회
     */
    async getRecordsByDateRange(startDate, endDate) {
        const allRecords = await this.getAllRecords();
        
        return allRecords.filter(record => {
            return record.date >= startDate && record.date <= endDate;
        });
    }
    
    /**
     * 오래된 데이터 정리 (현재 이번주와 지난주 데이터만 남기고 삭제)
     */
    async cleanupOldData() {
        // 이번주 시작일과 지난주 시작일 계산
        const today = new Date();
        const currentDay = today.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
        
        // 이번주 일요일 (시작일)
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - currentDay);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        // 지난주 일요일 (시작일)
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        
        // 삭제 기준일 (지난주 시작일 이전은 모두 삭제)
        const cutoffDate = this.formatDate(lastWeekStart);
        
        if (this.isUsingMemoryStorage) {
            // 메모리 저장소 정리
            for (const date in this.memoryStorage.attendance) {
                if (date < cutoffDate) {
                    delete this.memoryStorage.attendance[date];
                }
            }
            return;
        }
        
        // IndexedDB 데이터 정리
        const allRecords = await this.getAllRecords();
        
        for (const record of allRecords) {
            if (record.date < cutoffDate) {
                await this.deleteRecord(record.date);
            }
        }
    }
    
    /**
     * 기록 삭제
     */
    async deleteRecord(date) {
        if (this.isUsingMemoryStorage) {
            delete this.memoryStorage.attendance[date];
            return;
        }
        
        return this.transaction(this.STORE_NAME, 'readwrite', (store) => {
            store.delete(date);
        });
    }
    
    /**
     * 날짜 포맷 (YYYY-MM-DD)
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 설정 저장
     */
    async saveSetting(key, value) {
        if (this.isUsingMemoryStorage) {
            this.memoryStorage.settings[key] = { key, value };
            return;
        }
        
        return this.transaction(this.SETTINGS_STORE, 'readwrite', (store) => {
            store.put({ key, value });
        });
    }
    
    /**
     * 설정 조회
     */
    async getSetting(key) {
        if (this.isUsingMemoryStorage) {
            return this.memoryStorage.settings[key]?.value || null;
        }
        
        return new Promise((resolve, reject) => {
            this.transaction(this.SETTINGS_STORE, 'readonly', (store, _, reject) => {
                const request = store.get(key);
                
                request.onsuccess = () => {
                    resolve(request.result?.value || null);
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            }).catch(reject);
        });
    }
    
    /**
     * 모든 데이터 JSON 파일로 내보내기
     */
    async exportData() {
        try {
            // 모든 기록과 설정 조회
            const records = await this.getAllRecords();
            const settingsData = await this.getAllSettings();
            
            // 백업 데이터 생성
            const backupData = {
                records,
                settings: settingsData,
                timestamp: new Date().toISOString()
            };
            
            // JSON 문자열로 변환
            const jsonString = JSON.stringify(backupData, null, 2);
            
            // Blob 생성
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            return blob;
        } catch (error) {
            console.error('데이터 내보내기 오류:', error);
            this.showToast('데이터 내보내기에 실패했습니다.', 'error');
            return null;
        }
    }
    
    /**
     * 모든 설정 조회
     */
    async getAllSettings() {
        if (this.isUsingMemoryStorage) {
            return Object.values(this.memoryStorage.settings);
        }
        
        return new Promise((resolve, reject) => {
            const settings = [];
            
            this.transaction(this.SETTINGS_STORE, 'readonly', (store, _, reject) => {
                const request = store.openCursor();
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor) {
                        settings.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(settings);
                    }
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            }).catch(reject);
        });
    }
    
    /**
     * JSON 파일에서 데이터 가져오기
     */
    async importData(jsonString) {
        try {
            // JSON 문자열 파싱
            const backupData = JSON.parse(jsonString);
            
            // 기록 및 설정 가져오기
            const { records, settings } = backupData;
            
            // 기존 데이터 모두 삭제
            await this.clearAllData();
            
            // 기록 저장
            for (const record of records) {
                await this.saveRecord(record);
            }
            
            // 설정 저장
            for (const setting of settings) {
                await this.saveSetting(setting.key, setting.value);
            }
            
            this.showToast('데이터가 성공적으로 복원되었습니다.', 'success');
            return true;
        } catch (error) {
            console.error('데이터 가져오기 오류:', error);
            this.showToast('데이터 복원에 실패했습니다.', 'error');
            return false;
        }
    }
    
    /**
     * 모든 데이터 삭제
     */
    async clearAllData() {
        if (this.isUsingMemoryStorage) {
            this.memoryStorage.attendance = {};
            this.memoryStorage.settings = {};
            return;
        }
        
        // 출근 기록 삭제
        await this.transaction(this.STORE_NAME, 'readwrite', (store) => {
            store.clear();
        });
        
        // 설정 삭제
        await this.transaction(this.SETTINGS_STORE, 'readwrite', (store) => {
            store.clear();
        });
    }
}