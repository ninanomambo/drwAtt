/**
 * 다락원 간편 출퇴근 기록 관리 앱
 * Darakwon Attendance Ver 0.1
 */
document.addEventListener('DOMContentLoaded', () => {
    // 앱 초기화
    const app = new AttendanceApp();
    app.init();
});

/**
 * 출퇴근 관리 앱 클래스
 */
class AttendanceApp {
    constructor() {
        // DB 인스턴스 생성
        this.db = new AttendanceDB();
        
        // 요일 이름
        this.dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        
        // 주요 버튼 엘리먼트
        this.checkInBtn = document.getElementById('checkInBtn');
        this.checkOutBtn = document.getElementById('checkOutBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.backupBtn = document.getElementById('backupBtn');
        this.restoreBtn = document.getElementById('restoreBtn');
        this.googleConnectBtn = document.getElementById('googleConnectBtn');
        this.googleBackupBtn = document.getElementById('googleBackupBtn');
        this.googleRestoreBtn = document.getElementById('googleRestoreBtn');
        
        // 모달 엘리먼트
        this.recordModal = document.getElementById('recordModal');
        this.googleConnectModal = document.getElementById('googleConnectModal');
        
        // 파일 업로드 input
        this.fileInput = document.getElementById('fileInput');
        
        // 구글 API 관련 정보
        this.googleApiInfo = null;
        this.googleFileId = null;
        
        // 오프라인 상태 표시기
        this.offlineIndicator = null;
    }
    
    /**
     * 앱 초기화
     */
    async init() {
        // DB 연결 대기
        await this.db.init();
        
        // 이벤트 리스너 등록
        this.registerEventListeners();
        
        // 구글 API 정보 로드
        await this.loadGoogleApiInfo();
        
        // 오프라인 상태 표시기 생성
        this.createOfflineIndicator();
        
        // 네트워크 상태 감지
        this.setupNetworkDetection();
        
        // 오래된 데이터 정리
        this.db.cleanupOldData();
    }
    
    /**
     * 이벤트 리스너 등록
     */
    registerEventListeners() {
        // 출근 버튼 클릭
        this.checkInBtn.addEventListener('click', () => this.handleCheckIn());
        
        // 퇴근 버튼 클릭
        this.checkOutBtn.addEventListener('click', () => this.handleCheckOut());
        
        // 출근부 버튼 클릭
        this.recordBtn.addEventListener('click', () => this.showAttendanceRecord());
        
        // 백업 버튼 클릭
        this.backupBtn.addEventListener('click', () => this.backupData());
        
        // 복원 버튼 클릭
        this.restoreBtn.addEventListener('click', () => this.restoreData());
        
        // 구글 연동 버튼 클릭
        this.googleConnectBtn.addEventListener('click', () => this.showGoogleConnectModal());
        
        // 구글 백업 버튼 클릭
        this.googleBackupBtn.addEventListener('click', () => this.googleBackup());
        
        // 구글 복원 버튼 클릭
        this.googleRestoreBtn.addEventListener('click', () => this.googleRestore());
        
        // 모달 닫기 버튼 클릭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.recordModal.style.display = 'none';
                this.googleConnectModal.style.display = 'none';
            });
        });
        
        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (event) => {
            if (event.target === this.recordModal) {
                this.recordModal.style.display = 'none';
            }
            if (event.target === this.googleConnectModal) {
                this.googleConnectModal.style.display = 'none';
            }
        });
        
        // 파일 업로드 이벤트
        this.fileInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                const file = event.target.files[0];
                this.processUploadedFile(file);
            }
        });
        
        // 구글 API 폼 제출
        document.getElementById('googleApiForm').addEventListener('submit', (event) => {
            event.preventDefault();
            this.saveGoogleApiInfo();
        });
    }
    
    /**
     * 출근 처리
     */
    async handleCheckIn() {
        // 현재 날짜와 시간
        const now = new Date();
        const date = this.formatDateKey(now);
        const time = this.formatTime(now);
        
        // 진동 피드백
        this.vibrate();
        
        // 출근 버튼 애니메이션
        this.checkInBtn.classList.add('pulse');
        setTimeout(() => {
            this.checkInBtn.classList.remove('pulse');
        }, 500);
        
        // 출근 시간 기록
        const success = await this.db.checkIn(date, time);
        
        if (success) {
            // 파일 백업
            this.backupToFile();
        }
    }
    
    /**
     * 퇴근 처리
     */
    async handleCheckOut() {
        // 현재 날짜와 시간
        const now = new Date();
        const date = this.formatDateKey(now);
        const time = this.formatTime(now);
        
        // 진동 피드백
        this.vibrate();
        
        // 퇴근 버튼 애니메이션
        this.checkOutBtn.classList.add('pulse');
        setTimeout(() => {
            this.checkOutBtn.classList.remove('pulse');
        }, 500);
        
        // 퇴근 시간 기록
        const success = await this.db.checkOut(date, time);
        
        if (success) {
            // 파일 백업
            this.backupToFile();
        }
    }
    
    /**
     * 출근부 모달 표시
     */
    async showAttendanceRecord() {
        // 진동 피드백
        this.vibrate();
        
        // 현재 날짜
        const today = new Date();
        
        // 이번주와 지난주 날짜 정보 계산
        const { currentWeekDates, lastWeekDates } = this.calculateWeekDates(today);
        
        // 이번주와 지난주 출퇴근 기록 조회
        const currentWeekRecords = await this.getWeeklyRecords(currentWeekDates);
        const lastWeekRecords = await this.getWeeklyRecords(lastWeekDates);
        
        // 이번주 출근부 생성
        this.renderWeeklyTable('currentWeekTable', currentWeekDates, currentWeekRecords);
        
        // 지난주 출근부 생성
        this.renderWeeklyTable('lastWeekTable', lastWeekDates, lastWeekRecords);
        
        // 모달 표시
        this.recordModal.style.display = 'block';
        setTimeout(() => {
            this.recordModal.style.opacity = '1';
        }, 10);
    }
    
    /**
     * 주간 날짜 정보 계산
     */
    calculateWeekDates(baseDate) {
        const result = {
            currentWeekDates: [],
            lastWeekDates: []
        };
        
        // 오늘 요일 (0: 일요일, 1: 월요일, ...)
        const currentDay = baseDate.getDay();
        
        // 이번주 일요일 날짜 계산
        const currentWeekSunday = new Date(baseDate);
        currentWeekSunday.setDate(baseDate.getDate() - currentDay);
        
        // 지난주 일요일 날짜 계산
        const lastWeekSunday = new Date(currentWeekSunday);
        lastWeekSunday.setDate(lastWeekSunday.getDate() - 7);
        
        // 이번주 날짜 정보 생성
        for (let i = 0; i < 7; i++) {
            const date = new Date(currentWeekSunday);
            date.setDate(currentWeekSunday.getDate() + i);
            
            result.currentWeekDates.push({
                date: this.formatDateKey(date),
                displayDate: this.formatDisplayDate(date),
                dayName: this.dayNames[date.getDay()],
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }
        
        // 지난주 날짜 정보 생성
        for (let i = 0; i < 7; i++) {
            const date = new Date(lastWeekSunday);
            date.setDate(lastWeekSunday.getDate() + i);
            
            result.lastWeekDates.push({
                date: this.formatDateKey(date),
                displayDate: this.formatDisplayDate(date),
                dayName: this.dayNames[date.getDay()],
                isWeekend: date.getDay() === 0 || date.getDay() === 6
            });
        }
        
        return result;
    }
    
    /**
     * 주간 출퇴근 기록 조회
     */
    async getWeeklyRecords(weekDates) {
        const records = {};
        
        // 각 날짜별 출퇴근 기록 조회
        for (const dateInfo of weekDates) {
            const record = await this.db.getRecord(dateInfo.date);
            records[dateInfo.date] = record;
        }
        
        return records;
    }
    
    /**
     * 주간 출근부 테이블 생성
     */
    renderWeeklyTable(tableId, weekDates, weekRecords) {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        tableBody.innerHTML = '';
        
        let weekdayTotalHours = 0;
        
        for (const dateInfo of weekDates) {
            const { date, displayDate, dayName, isWeekend } = dateInfo;
            const record = weekRecords[date] || {};
            
            // 근무 시간 계산
            const workingHours = this.calculateWorkingHours(record.checkIn, record.checkOut);
            
            // 주중(월~금) 근무 시간 합산
            if (!isWeekend && workingHours !== null) {
                weekdayTotalHours += workingHours;
            }
            
            // tr 요소 생성
            const tr = document.createElement('tr');
            
            // 주말인 경우 배경색 변경
            if (isWeekend) {
                tr.classList.add('weekend');
            }
            
            // td 요소 생성
            tr.innerHTML = `
                <td>${displayDate}</td>
                <td>${dayName}</td>
                <td class="editable-cell" data-date="${date}" data-type="checkIn">${record.checkIn || ''}</td>
                <td class="editable-cell" data-date="${date}" data-type="checkOut">${record.checkOut || ''}</td>
                <td>${workingHours !== null ? `${workingHours}시간` : ''}</td>
            `;
            
            tableBody.appendChild(tr);
        }
        
        // 주중 근무 시간 합계 표시
        document.getElementById(`${tableId}TotalHours`).textContent = `${weekdayTotalHours}시간`;
        
        // 시간 수정 이벤트 리스너 등록
        this.setupTimeEditListeners(tableId);
    }
    
    /**
     * 출퇴근 시간 수정 이벤트 리스너 설정
     */
    setupTimeEditListeners(tableId) {
        const editableCells = document.querySelectorAll(`#${tableId} .editable-cell`);
        
        editableCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.getAttribute('data-date');
                const type = cell.getAttribute('data-type');
                const currentValue = cell.textContent.trim();
                
                // 입력 필드 생성
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
                input.placeholder = '00:00';
                
                // 기존 내용 임시 저장
                const originalContent = cell.innerHTML;
                
                // 입력 필드로 교체
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                
                // 포커스 이동 또는 Enter 키 누를 때 저장
                const saveChanges = async () => {
                    const newValue = input.value.trim();
                    
                    // 시간 형식 유효성 검사
                    if (newValue && !/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(newValue)) {
                        this.db.showToast('유효한 시간 형식을 입력해주세요. (예: 09:00)', 'error');
                        cell.innerHTML = originalContent;
                        return;
                    }
                    
                    // 출퇴근 시간 업데이트
                    if (type === 'checkIn') {
                        const record = await this.db.getRecord(date) || { date };
                        record.checkIn = newValue;
                        await this.db.saveRecord(record);
                    } else if (type === 'checkOut') {
                        const record = await this.db.getRecord(date) || { date };
                        record.checkOut = newValue;
                        await this.db.saveRecord(record);
                    }
                    
                    // 파일 백업
                    this.backupToFile();
                    
                    // 출근부 갱신
                    this.showAttendanceRecord();
                };
                
                // 포커스 아웃 시 저장
                input.addEventListener('blur', saveChanges);
                
                // Enter 키 누를 때 저장
                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        saveChanges();
                    }
                });
            });
        });
    }
    
    /**
     * 근무 시간 계산
     */
    calculateWorkingHours(checkInTime, checkOutTime) {
        if (!checkInTime || !checkOutTime) {
            return null;
        }
        
        // 시간 문자열 파싱
        const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
        const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
        
        // 출근 및 퇴근 시간(분 단위)
        const checkInMinutes = checkInHour * 60 + checkInMinute;
        const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
        
        // 점심 시간 (11:30 ~ 12:00)
        const lunchStartMinutes = 11 * 60 + 30;
        const lunchEndMinutes = 12 * 60 + 0;
        
        // 총 근무 시간 계산 (분 단위)
        let totalMinutes = checkOutMinutes - checkInMinutes;
        
        // 음수인 경우 (예: 퇴근이 자정 이후) 24시간 추가
        if (totalMinutes < 0) {
            totalMinutes += 24 * 60;
        }
        
        // 점심 시간 제외
        if (checkInMinutes <= lunchStartMinutes && checkOutMinutes >= lunchEndMinutes) {
            // 점심 시간이 근무 시간 내에 포함되는 경우
            totalMinutes -= (lunchEndMinutes - lunchStartMinutes);
        } else if (checkInMinutes <= lunchStartMinutes && checkOutMinutes > lunchStartMinutes && checkOutMinutes < lunchEndMinutes) {
            // 점심 시간 중간에 퇴근한 경우
            totalMinutes -= (checkOutMinutes - lunchStartMinutes);
        } else if (checkInMinutes > lunchStartMinutes && checkInMinutes < lunchEndMinutes && checkOutMinutes >= lunchEndMinutes) {
            // 점심 시간 중간에 출근한 경우
            totalMinutes -= (lunchEndMinutes - checkInMinutes);
        }
        
        // 11시간 초과 근무 시 저녁식사 시간 1시간 추가 제외
        if (totalMinutes > 11 * 60) {
            totalMinutes -= 60; // 저녁식사 시간 1시간 제외
        }
        
        // 시간 단위로 변환 (소수점 반올림)
        const hours = Math.round(totalMinutes / 60 * 10) / 10;
        
        return hours;
    }
    
    /**
     * 데이터 백업
     */
    async backupData() {
        try {
            // 진동 피드백
            this.vibrate();
            
            // 데이터 내보내기
            const blob = await this.db.exportData();
            
            if (blob) {
                // 다운로드 링크 생성
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'darakwon-attendance-backup.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.db.showToast('데이터가 성공적으로 백업되었습니다.', 'success');
            }
        } catch (error) {
            console.error('백업 오류:', error);
            this.db.showToast('백업 중 오류가 발생했습니다.', 'error');
        }
    }
    
    /**
     * 데이터 복원
     */
    async restoreData() {
        // 진동 피드백
        this.vibrate();
        
        // 파일 선택 대화상자 표시
        this.fileInput.click();
    }
    
    /**
     * 업로드된 파일 처리
     */
    async processUploadedFile(file) {
        try {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                const jsonString = event.target.result;
                const success = await this.db.importData(jsonString);
                
                if (success) {
                    // 출근부 갱신
                    this.showAttendanceRecord();
                }
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error('파일 처리 오류:', error);
            this.db.showToast('파일 처리 중 오류가 발생했습니다.', 'error');
        }
    }
    
    /**
     * 구글 연동 모달 표시
     */
    showGoogleConnectModal() {
        // 진동 피드백
        this.vibrate();
        
        // 저장된 API 정보 표시
        if (this.googleApiInfo) {
            document.getElementById('apiKey').value = this.googleApiInfo.apiKey || '';
            document.getElementById('clientId').value = this.googleApiInfo.clientId || '';
        }
        
        // 모달 표시
        this.googleConnectModal.style.display = 'block';
        setTimeout(() => {
            this.googleConnectModal.style.opacity = '1';
        }, 10);
    }
    
    /**
     * 구글 API 정보 저장
     */
    async saveGoogleApiInfo() {
        const apiKey = document.getElementById('apiKey').value.trim();
        const clientId = document.getElementById('clientId').value.trim();
        
        if (!apiKey || !clientId) {
            this.db.showToast('API Key와 Client ID를 모두 입력해주세요.', 'error');
            return;
        }
        
        // API 정보 저장
        this.googleApiInfo = { apiKey, clientId };
        await this.db.saveSetting('googleApiInfo', this.googleApiInfo);
        
        // 모달 닫기
        this.googleConnectModal.style.display = 'none';
        
        this.db.showToast('Google API 정보가 저장되었습니다.', 'success');
    }
    
    /**
     * 저장된 구글 API 정보 로드
     */
    async loadGoogleApiInfo() {
        this.googleApiInfo = await this.db.getSetting('googleApiInfo');
        this.googleFileId = await this.db.getSetting('googleFileId');
        
        // 구글 버튼 상태 업데이트
        this.updateGoogleButtonsState();
    }
    
    /**
     * 구글 버튼 상태 업데이트
     */
    updateGoogleButtonsState() {
        if (this.googleApiInfo) {
            this.googleBackupBtn.removeEventListener('click', this.showGoogleConnectRequiredMessage);
            this.googleRestoreBtn.removeEventListener('click', this.showGoogleConnectRequiredMessage);
            
            this.googleBackupBtn.addEventListener('click', () => this.googleBackup());
            this.googleRestoreBtn.addEventListener('click', () => this.googleRestore());
        } else {
            this.googleBackupBtn.addEventListener('click', this.showGoogleConnectRequiredMessage);
            this.googleRestoreBtn.addEventListener('click', this.showGoogleConnectRequiredMessage);
        }
    }
    
    /**
     * 구글 연동 필요 메시지 표시
     */
    showGoogleConnectRequiredMessage = () => {
        this.db.showToast('Google 연동이 필요합니다.', 'error');
        
        // 구글 연동 모달 표시
        setTimeout(() => {
            this.showGoogleConnectModal();
        }, 1000);
    }
    
    /**
     * 구글 드라이브 백업
     */
    async googleBackup() {
        // 진동 피드백
        this.vibrate();
        
        if (!this.googleApiInfo) {
            this.showGoogleConnectRequiredMessage();
            return;
        }
        
        this.db.showToast('Google 드라이브 백업 기능은 추가 개발이 필요합니다.', 'error');
        
        // 여기서 실제 구글 드라이브 API를 사용한 백업 기능을 구현하게 됩니다.
        // 이는 구글 API 클라이언트 라이브러리와 OAuth 인증을 필요로 합니다.
    }
    
    /**
     * 구글 드라이브 복원
     */
    async googleRestore() {
        // 진동 피드백
        this.vibrate();
        
        if (!this.googleApiInfo) {
            this.showGoogleConnectRequiredMessage();
            return;
        }
        
        this.db.showToast('Google 드라이브 복원 기능은 추가 개발이 필요합니다.', 'error');
        
        // 여기서 실제 구글 드라이브 API를 사용한 복원 기능을 구현하게 됩니다.
        // 이는 구글 API 클라이언트 라이브러리와 OAuth 인증을 필요로 합니다.
    }
    
    /**
     * 파일 백업
     */
    async backupToFile() {
        try {
            // 데이터 내보내기
            const blob = await this.db.exportData();
            
            if (blob) {
                // 로컬 파일로 저장
                const saveBlob = async (blob) => {
                    try {
                        // Chrome의 FileSystem API 사용 시도
                        if ('chooseFileSystemEntries' in window || 'showSaveFilePicker' in window) {
                            const handle = await window.showSaveFilePicker({
                                suggestedName: 'darakwon-attendance-backup.json',
                                types: [{
                                    description: 'JSON Files',
                                    accept: { 'application/json': ['.json'] }
                                }]
                            });
                            
                            const writable = await handle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                            
                            return true;
                        }
                    } catch (e) {
                        console.log('자동 파일 저장 실패, 대체 방법 사용');
                    }
                    
                    return false;
                };
                
                // 자동 저장 실패 시 아무 작업 없이 진행 (백그라운드 동기화 작업이므로)
                await saveBlob(blob).catch(e => {});
            }
        } catch (error) {
            console.error('자동 백업 오류:', error);
            // 백그라운드 작업이므로 오류 메시지 표시 없음
        }
    }
    
    /**
     * 오프라인 상태 표시기 생성
     */
    createOfflineIndicator() {
        // 이미 존재하는 경우 제거
        const existingIndicator = document.querySelector('.offline-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // 오프라인 상태 표시기 생성
        this.offlineIndicator = document.createElement('div');
        this.offlineIndicator.className = 'offline-indicator';
        this.offlineIndicator.textContent = '오프라인 모드';
        document.body.prepend(this.offlineIndicator);
        
        // 초기 네트워크 상태 확인
        this.updateOfflineStatus();
    }
    
    /**
     * 네트워크 상태 감지 설정
     */
    setupNetworkDetection() {
        window.addEventListener('online', () => this.updateOfflineStatus());
        window.addEventListener('offline', () => this.updateOfflineStatus());
    }
    
    /**
     * 오프라인 상태 업데이트
     */
    updateOfflineStatus() {
        if (navigator.onLine) {
            this.offlineIndicator.classList.remove('show');
        } else {
            this.offlineIndicator.classList.add('show');
        }
    }
    
    /**
     * 진동 피드백
     */
    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    /**
     * 날짜 키 포맷 (YYYY-MM-DD)
     */
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * 표시용 날짜 포맷 (DD일)
     */
    formatDisplayDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}일`;
    }
    
    /**
     * 시간 포맷 (HH:MM)
     */
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
}