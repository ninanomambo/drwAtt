/**
 * UI 관리 모듈
 * 사용자 인터페이스 요소 및 이벤트 처리
 */
const UI = (() => {
    // DOM 요소 참조
    const elements = {
        checkInBtn: document.getElementById('checkInBtn'),
        checkOutBtn: document.getElementById('checkOutBtn'),
        attendanceBtn: document.getElementById('attendanceBtn'),
        backupBtn: document.getElementById('backupBtn'),
        restoreBtn: document.getElementById('restoreBtn'),
        googleLinkBtn: document.getElementById('googleLinkBtn'),
        googleBackupBtn: document.getElementById('googleBackupBtn'),
        googleRestoreBtn: document.getElementById('googleRestoreBtn'),
        attendanceLayer: document.getElementById('attendanceLayer'),
        closeLayerBtn: document.getElementById('closeLayerBtn'),
        currentWeekBody: document.getElementById('currentWeekBody'),
        lastWeekBody: document.getElementById('lastWeekBody'),
        currentWeekTotal: document.getElementById('currentWeekTotal'),
        lastWeekTotal: document.getElementById('lastWeekTotal'),
        googleAuthLayer: document.getElementById('googleAuthLayer'),
        closeGoogleAuthBtn: document.getElementById('closeGoogleAuthBtn'),
        googleAuthForm: document.getElementById('googleAuthForm'),
        toast: document.getElementById('toast')
    };
    
    // 요일 이름
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    
    /**
     * 현재 시간을 한국 시간대로 포맷팅
     * @returns {Object} 날짜 문자열, 시간 문자열, Date 객체
     */
    const getCurrentTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const dateString = `${year}-${month}-${day}`;
        const timeString = `${hours}:${minutes}`;
        const displayString = `${month}월-${day}일 ${hours}:${minutes}`;
        
        return {
            dateString,
            timeString,
            displayString,
            dateObj: now
        };
    };
    
    /**
     * 토스트 메시지 표시
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 지속 시간 (ms)
     */
    const showToast = (message, duration = 2000) => {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        
        // 햅틱 피드백 (모바일)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, duration);
    };
    
    /**
     * 출근부 레이어 열기
     */
    const openAttendanceLayer = () => {
        elements.attendanceLayer.style.display = 'flex';
        
        // GSAP 애니메이션
        gsap.fromTo(
            elements.attendanceLayer.querySelector('.layer-content'),
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
    };
    
    /**
     * 출근부 레이어 닫기
     */
    const closeAttendanceLayer = () => {
        gsap.to(
            elements.attendanceLayer.querySelector('.layer-content'),
            {
                opacity: 0,
                y: 20,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => {
                    elements.attendanceLayer.style.display = 'none';
                }
            }
        );
    };
    
    /**
     * Google 인증 레이어 열기
     */
    const openGoogleAuthLayer = () => {
        elements.googleAuthLayer.style.display = 'flex';
        
        // GSAP 애니메이션
        gsap.fromTo(
            elements.googleAuthLayer.querySelector('.layer-content'),
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
        
        // 저장된 인증 정보가 있으면 폼에 채우기
        const authData = DB.getGoogleAuthData();
        if (authData) {
            document.getElementById('clientId').value = authData.clientId || '';
            document.getElementById('apiKey').value = authData.apiKey || '';
        }
    };
    
    /**
     * Google 인증 레이어 닫기
     */
    const closeGoogleAuthLayer = () => {
        gsap.to(
            elements.googleAuthLayer.querySelector('.layer-content'),
            {
                opacity: 0,
                y: 20,
                duration: 0.2,
                ease: 'power2.in',
                onComplete: () => {
                    elements.googleAuthLayer.style.display = 'none';
                }
            }
        );
    };
    
    /**
     * 출근 버튼 애니메이션
     */
    const animateCheckInButton = () => {
        elements.checkInBtn.classList.add('pulse');
        setTimeout(() => {
            elements.checkInBtn.classList.remove('pulse');
        }, 300);
    };
    
    /**
     * 퇴근 버튼 애니메이션
     */
    const animateCheckOutButton = () => {
        elements.checkOutBtn.classList.add('pulse');
        setTimeout(() => {
            elements.checkOutBtn.classList.remove('pulse');
        }, 300);
    };
    
    /**
     * 날짜 문자열을 한국 형식으로 변환 (MM월-DD일)
     * @param {string} dateString - YYYY-MM-DD 형식의 날짜 문자열
     * @returns {string} MM월-DD일 형식의 날짜 문자열
     */
    const formatDateToKorean = (dateString) => {
        const parts = dateString.split('-');
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${String(month).padStart(2, '0')}월-${String(day).padStart(2, '0')}일`;
    };
    
    /**
     * 시간 문자열을 한국 형식으로 변환 (HH:MM)
     * @param {string} timeString - 시간 문자열
     * @returns {string} HH:MM 형식의 시간 문자열
     */
    const formatTimeToKorean = (timeString) => {
        if (!timeString) return '';
        return timeString;
    };
    
    /**
     * 시간을 수정 가능한 입력 필드로 변경
     * @param {HTMLElement} cell - 변경할 셀 요소
     * @param {string} timeValue - 현재 시간 값
     * @param {function} onChangeCallback - 값 변경 시 콜백 함수
     */
    const makeTimeEditable = (cell, timeValue, onChangeCallback) => {
        // 이미 수정 중인지 확인
        if (cell.querySelector('input')) return;
        
        // 현재 텍스트 내용 저장
        const currentText = cell.textContent;
        
        // 입력 필드 생성
        const input = document.createElement('input');
        input.type = 'time';
        input.className = 'time-input';
        input.value = timeValue || '';
        
        // 기존 내용 지우고 입력 필드 추가
        cell.textContent = '';
        cell.appendChild(input);
        
        // 포커스
        input.focus();
        
        // 값 변경 이벤트
        const handleChange = () => {
            const newValue = input.value;
            
            // 값이 비어있거나 유효하지 않은 경우
            if (!newValue) {
                cell.textContent = currentText;
                return;
            }
            
            // 콜백 실행 및 셀 업데이트
            onChangeCallback(newValue);
            cell.textContent = newValue;
            cell.classList.add('time-cell');
        };
        
        // 이벤트 리스너
        input.addEventListener('blur', handleChange);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleChange();
                e.preventDefault();
            }
        });
    };
    
    /**
     * 근무시간 계산 (점심, 저녁 시간 제외)
     * @param {string} checkInTime - 출근 시간 (HH:MM)
     * @param {string} checkOutTime - 퇴근 시간 (HH:MM)
     * @returns {number} 근무 시간 (시간 단위)
     */
    const calculateWorkHours = (checkInTime, checkOutTime) => {
        if (!checkInTime || !checkOutTime) return 0;
        
        // 시간 파싱
        const [inHours, inMinutes] = checkInTime.split(':').map(Number);
        const [outHours, outMinutes] = checkOutTime.split(':').map(Number);
        
        // 분 단위로 변환
        const checkInMinutes = inHours * 60 + inMinutes;
        const checkOutMinutes = outHours * 60 + outMinutes;
        
        // 점심시간 (11:30 - 12:00)
        const lunchStartMinutes = 11 * 60 + 30;
        const lunchEndMinutes = 12 * 60;
        
        // 총 근무 시간 계산 (분 단위)
        let totalMinutes = checkOutMinutes - checkInMinutes;
        
        // 음수인 경우 (다음날까지 근무)
        if (totalMinutes < 0) {
            totalMinutes += 24 * 60;
        }
        
        // 점심시간 제외
        if (checkInMinutes <= lunchStartMinutes && checkOutMinutes >= lunchEndMinutes) {
            // 점심시간이 근무시간에 포함된 경우
            totalMinutes -= (lunchEndMinutes - lunchStartMinutes);
        } else if (checkInMinutes <= lunchStartMinutes && checkOutMinutes > lunchStartMinutes && checkOutMinutes < lunchEndMinutes) {
            // 퇴근이 점심시간 중간인 경우
            totalMinutes -= (checkOutMinutes - lunchStartMinutes);
        } else if (checkInMinutes >= lunchStartMinutes && checkInMinutes < lunchEndMinutes && checkOutMinutes >= lunchEndMinutes) {
            // 출근이 점심시간 중간인 경우
            totalMinutes -= (lunchEndMinutes - checkInMinutes);
        } else if (checkInMinutes >= lunchStartMinutes && checkInMinutes < lunchEndMinutes && 
                  checkOutMinutes > lunchStartMinutes && checkOutMinutes <= lunchEndMinutes) {
            // 출퇴근이 모두 점심시간 내인 경우
            totalMinutes = 0;
        }
        
        // 11시간 초과 근무시 저녁식사 시간 1시간 제외
        if (totalMinutes > 11 * 60) {
            totalMinutes -= 60;
        }
        
        // 시간 단위로 변환 (소수점 한자리)
        return Math.round(totalMinutes / 60 * 10) / 10;
    };
    
    /**
     * 주중 근무시간 합계 계산 (월~금)
     * @param {Array} weekData - 주간 출퇴근 데이터 배열
     * @returns {number} 주중 근무시간 합계
     */
    const calculateWeekdayTotal = (weekData) => {
        return weekData.reduce((total, day) => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();
            
            // 주중만 계산 (1=월요일, 5=금요일)
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && day.checkInTime && day.checkOutTime) {
                return total + calculateWorkHours(day.checkInTime, day.checkOutTime);
            }
            
            return total;
        }, 0);
    };
    
    /**
     * 출근부 테이블 생성
     * @param {number} year - 연도
     * @param {number} weekNumber - 주차
     * @param {HTMLElement} tableBody - 테이블 본문 요소
     * @param {HTMLElement} totalElement - 합계 표시 요소
     */
    const renderWeekTable = async (year, weekNumber, tableBody, totalElement) => {
        // 해당 주차의 첫 날 찾기
        const firstDayOfWeek = getFirstDayOfWeek(year, weekNumber);
        
        // 테이블 본문 초기화
        tableBody.innerHTML = '';
        
        // 주간 데이터 가져오기
        const weekData = await DB.getWeekData(year, weekNumber);
        
        // 각 날짜에 대한 행 생성
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(firstDayOfWeek);
            currentDate.setDate(firstDayOfWeek.getDate() + i);
            
            const dateString = currentDate.toISOString().split('T')[0];
            const day = currentDate.getDate();
            const dayOfWeek = currentDate.getDay();
            
            // 해당 날짜의 데이터 찾기
            const dayData = weekData.find(data => data.date === dateString) || {};
            
            // 행 생성
            const row = document.createElement('tr');
            
            // 날짜 셀
            const dateCell = document.createElement('td');
            dateCell.textContent = String(day).padStart(2, '0') + '일';
            row.appendChild(dateCell);
            
            // 요일 셀
            const dayNameCell = document.createElement('td');
            dayNameCell.textContent = dayNames[dayOfWeek];
            // 주말 색상 표시
            if (dayOfWeek === 0) dayNameCell.classList.add('sunday');
            if (dayOfWeek === 6) dayNameCell.classList.add('saturday');
            row.appendChild(dayNameCell);
            
            // 출근 시간 셀
            const checkInCell = document.createElement('td');
            checkInCell.textContent = formatTimeToKorean(dayData.checkInTime || '');
            checkInCell.classList.add('time-cell');
            checkInCell.addEventListener('click', () => {
                makeTimeEditable(checkInCell, dayData.checkInTime, async (newValue) => {
                    // 데이터 업데이트
                    const updatedData = { ...dayData, checkInTime: newValue };
                    await DB.saveData(dateString, updatedData);
                    
                    // 근무시간 업데이트
                    if (updatedData.checkOutTime) {
                        const hours = calculateWorkHours(newValue, updatedData.checkOutTime);
                        workHoursCell.textContent = hours > 0 ? hours + '시간' : '';
                        
                        // 주간 합계 업데이트
                        const updatedWeekData = await DB.getWeekData(year, weekNumber);
                        const weekdayTotal = calculateWeekdayTotal(updatedWeekData);
                        totalElement.textContent = weekdayTotal + '시간';
                    }
                });
            });
            row.appendChild(checkInCell);
            
            // 퇴근 시간 셀
            const checkOutCell = document.createElement('td');
            checkOutCell.textContent = formatTimeToKorean(dayData.checkOutTime || '');
            checkOutCell.classList.add('time-cell');
            checkOutCell.addEventListener('click', () => {
                makeTimeEditable(checkOutCell, dayData.checkOutTime, async (newValue) => {
                    // 데이터 업데이트
                    const updatedData = { ...dayData, checkOutTime: newValue };
                    await DB.saveData(dateString, updatedData);
                    
                    // 근무시간 업데이트
                    if (updatedData.checkInTime) {
                        const hours = calculateWorkHours(updatedData.checkInTime, newValue);
                        workHoursCell.textContent = hours > 0 ? hours + '시간' : '';
                        
                        // 주간 합계 업데이트
                        const updatedWeekData = await DB.getWeekData(year, weekNumber);
                        const weekdayTotal = calculateWeekdayTotal(updatedWeekData);
                        totalElement.textContent = weekdayTotal + '시간';
                    }
                });
            });
            row.appendChild(checkOutCell);
            
            // 근무 시간 셀
            const workHoursCell = document.createElement('td');
            if (dayData.checkInTime && dayData.checkOutTime) {
                const hours = calculateWorkHours(dayData.checkInTime, dayData.checkOutTime);
                workHoursCell.textContent = hours > 0 ? hours + '시간' : '';
            }
            row.appendChild(workHoursCell);
            
            // 테이블에 행 추가
            tableBody.appendChild(row);
        }
        
        // 주중 근무시간 합계 계산 및 표시
        const weekdayTotal = calculateWeekdayTotal(weekData);
        totalElement.textContent = weekdayTotal + '시간';
    };
    
    /**
     * 주차의 첫 날(일요일) 찾기
     * @param {number} year - 연도
     * @param {number} weekNumber - 주차
     * @returns {Date} 해당 주차의 첫날(일요일) 객체
     */
    const getFirstDayOfWeek = (year, weekNumber) => {
        // 해당 연도의 첫 날
        const firstDayOfYear = new Date(year, 0, 1);
        
        // 첫 주의 일요일 찾기
        const firstSunday = new Date(firstDayOfYear);
        const dayOffset = firstDayOfYear.getDay();
        
        if (dayOffset > 0) {
            firstSunday.setDate(firstDayOfYear.getDate() + (7 - dayOffset));
        }
        
        // 원하는 주차의 일요일
        const targetSunday = new Date(firstSunday);
        targetSunday.setDate(firstSunday.getDate() + (weekNumber - 1) * 7);
        
        return targetSunday;
    };
    
    /**
     * 출근부 테이블 렌더링
     */
    const renderAttendanceTables = async () => {
        // 현재 날짜의 연도와 주차
        const today = new Date();
        const [currentYear, currentWeek] = DB.getWeekNumber(today);
        
        // 지난주 계산
        let lastWeek = currentWeek - 1;
        let lastWeekYear = currentYear;
        
        if (lastWeek < 1) {
            lastWeek = getWeeksInYear(currentYear - 1);
            lastWeekYear = currentYear - 1;
        }
        
        // 이번주 테이블 렌더링
        await renderWeekTable(currentYear, currentWeek, elements.currentWeekBody, elements.currentWeekTotal);
        
        // 지난주 테이블 렌더링
        await renderWeekTable(lastWeekYear, lastWeek, elements.lastWeekBody, elements.lastWeekTotal);
    };
    
    /**
     * 파일 다운로드 (백업용)
     * @param {string} content - 파일 내용
     * @param {string} fileName - 파일 이름
     * @param {string} contentType - 파일 MIME 타입
     */
    const downloadFile = (content, fileName, contentType) => {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
        
        URL.revokeObjectURL(a.href);
    };
    
    /**
     * 파일 선택 및 읽기 (복원용)
     * @returns {Promise<Object>} 파일 내용
     */
    const readFile = () => {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                
                if (!file) {
                    reject(new Error('파일이 선택되지 않았습니다.'));
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('파일 형식이 올바르지 않습니다.'));
                    }
                };
                
                reader.onerror = () => {
                    reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
                };
                
                reader.readAsText(file);
            });
            
            input.click();
        });
    };
    
    /**
     * 연도의 주 수 계산
     * @param {number} year - 연도
     * @returns {number} 해당 연도의 주 수
     */
    const getWeeksInYear = (year) => {
        const d = new Date(year, 11, 31);
        const week = DB.getWeekNumber(d)[1];
        return week === 1 ? DB.getWeekNumber(new Date(year, 11, 24))[1] : week;
    };
    
    /**
     * 이벤트 리스너 초기화
     */
    const initEventListeners = () => {
        // 출근 버튼 클릭
        elements.checkInBtn.addEventListener('click', async () => {
            const { dateString, timeString, displayString, dateObj } = getCurrentTime();
            
            // 기존 데이터 가져오기
            const existingData = await DB.getData(dateString) || {};
            
            // 출근 시간이 이미 있으면 업데이트하지 않음
            if (existingData.checkInTime) {
                showToast('이미 출근 기록이 있습니다.');
                return;
            }
            
            // 데이터 저장
            const data = {
                ...existingData,
                checkInTime: timeString,
                checkInDisplayTime: displayString
            };
            
            await DB.saveData(dateString, data);
            
            // 데이터 정리
            await DB.cleanOldData();
            
            // 애니메이션 및 알림
            animateCheckInButton();
            showToast('출근 시간이 기록되었습니다: ' + displayString);
        });
        
        // 퇴근 버튼 클릭
        elements.checkOutBtn.addEventListener('click', async () => {
            const { dateString, timeString, displayString, dateObj } = getCurrentTime();
            
            // 기존 데이터 가져오기
            const existingData = await DB.getData(dateString) || {};
            
            // 출근 시간이 없으면 알림
            if (!existingData.checkInTime) {
                showToast('먼저 출근 기록을 해주세요.');
                return;
            }
            
            // 데이터 저장 (퇴근 시간은 항상 업데이트)
            const data = {
                ...existingData,
                checkOutTime: timeString,
                checkOutDisplayTime: displayString
            };
            
            await DB.saveData(dateString, data);
            
            // 데이터 정리
            await DB.cleanOldData();
            
            // 애니메이션 및 알림
            animateCheckOutButton();
            showToast('퇴근 시간이 기록되었습니다: ' + displayString);
        });
        
        // 출근부 버튼 클릭
        elements.attendanceBtn.addEventListener('click', async () => {
            await renderAttendanceTables();
            openAttendanceLayer();
        });
        
        // 출근부 레이어 닫기 버튼
        elements.closeLayerBtn.addEventListener('click', () => {
            closeAttendanceLayer();
        });
        
        // 백업 버튼 클릭
        elements.backupBtn.addEventListener('click', async () => {
            try {
                // 모든 데이터 가져오기
                const data = await DB.getAllData();
                
                // JSON 파일로 변환 및 다운로드
                const jsonData = JSON.stringify(data, null, 2);
                downloadFile(jsonData, 'darakwon-attendance-backup.json', 'application/json');
                
                showToast('백업 파일이 다운로드되었습니다.');
            } catch (error) {
                console.error('백업 오류:', error);
                showToast('백업 중 오류가 발생했습니다.');
            }
        });
        
        // 복원 버튼 클릭
        elements.restoreBtn.addEventListener('click', async () => {
            try {
                // 파일 선택 및 읽기
                const data = await readFile();
                
                if (!Array.isArray(data)) {
                    throw new Error('유효하지 않은 백업 파일 형식입니다.');
                }
                
                // 데이터 복원
                await DB.restoreAllData(data);
                
                showToast('데이터가 성공적으로 복원되었습니다.');
            } catch (error) {
                console.error('복원 오류:', error);
                showToast(error.message || '복원 중 오류가 발생했습니다.');
            }
        });
        
        // Google 연동 버튼 클릭
        elements.googleLinkBtn.addEventListener('click', () => {
            openGoogleAuthLayer();
        });
        
        // Google 연동 레이어 닫기 버튼
        elements.closeGoogleAuthBtn.addEventListener('click', () => {
            closeGoogleAuthLayer();
        });
        
        // Google 인증 폼 제출
        elements.googleAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const clientId = document.getElementById('clientId').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();
            
            if (!clientId || !apiKey) {
                showToast('모든 필드를 입력해주세요.');
                return;
            }
            
            // 인증 정보 저장
            const authData = { clientId, apiKey };
            DB.saveGoogleAuthData(authData);
            
            closeGoogleAuthLayer();
            showToast('Google 인증 정보가 저장되었습니다.');
            
            // Google API 초기화
            if (typeof GoogleAPI !== 'undefined') {
                GoogleAPI.init(authData);
            }
        });
        
        // Google 백업 버튼 클릭
        elements.googleBackupBtn.addEventListener('click', async () => {
            // 인증 정보 확인
            const authData = DB.getGoogleAuthData();
            
            if (!authData || !authData.clientId || !authData.apiKey) {
                showToast('먼저 Google 연동을 완료해주세요.');
                return;
            }
            
            try {
                // Google API를 통한 백업
                if (typeof GoogleAPI !== 'undefined') {
                    const data = await DB.getAllData();
                    const result = await GoogleAPI.backupToGoogleDrive(data);
                    
                    if (result.success) {
                        showToast('Google 드라이브에 백업되었습니다.');
                    } else {
                        throw new Error(result.error || 'Google 드라이브 백업 실패');
                    }
                } else {
                    throw new Error('Google API가 초기화되지 않았습니다.');
                }
            } catch (error) {
                console.error('Google 백업 오류:', error);
                showToast(error.message || 'Google 드라이브 백업 중 오류가 발생했습니다.');
            }
        });
        
        // Google 복원 버튼 클릭
        elements.googleRestoreBtn.addEventListener('click', async () => {
            // 인증 정보 확인
            const authData = DB.getGoogleAuthData();
            
            if (!authData || !authData.clientId || !authData.apiKey) {
                showToast('먼저 Google 연동을 완료해주세요.');
                return;
            }
            
            try {
                // Google API를 통한 복원
                if (typeof GoogleAPI !== 'undefined') {
                    const result = await GoogleAPI.restoreFromGoogleDrive();
                    
                    if (result.success && result.data) {
                        // 데이터 복원
                        await DB.restoreAllData(result.data);
                        showToast('Google 드라이브에서 데이터가 복원되었습니다.');
                    } else {
                        throw new Error(result.error || 'Google 드라이브 복원 실패');
                    }
                } else {
                    throw new Error('Google API가 초기화되지 않았습니다.');
                }
            } catch (error) {
                console.error('Google 복원 오류:', error);
                showToast(error.message || 'Google 드라이브 복원 중 오류가 발생했습니다.');
            }
        });
        
        // 출근부 레이어 외부 클릭 시 닫기
        elements.attendanceLayer.addEventListener('click', (e) => {
            if (e.target === elements.attendanceLayer) {
                closeAttendanceLayer();
            }
        });
        
        // Google 인증 레이어 외부 클릭 시 닫기
        elements.googleAuthLayer.addEventListener('click', (e) => {
            if (e.target === elements.googleAuthLayer) {
                closeGoogleAuthLayer();
            }
        });
    };
    
    /**
     * UI 모듈 초기화
     */
    const init = () => {
        // 이벤트 리스너 설정
        initEventListeners();
        
        // PWA 인스톨 이벤트 처리
        window.addEventListener('beforeinstallprompt', (e) => {
            // 인스톨 프롬프트 저장
            window.deferredInstallPrompt = e;
        });
    };
    
    // 공개 API
    return {
        init,
        showToast,
        renderAttendanceTables,
        getCurrentTime,
        calculateWorkHours
    };
})();