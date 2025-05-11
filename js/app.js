/**
 * Darakwon Attendance 앱 메인 모듈
 * 앱 초기화 및 제어 로직
 */
(async function() {
    'use strict';
    
    /**
     * 앱 초기화
     */
    const initApp = async () => {
        try {
            // 데이터베이스 초기화
            const storageStatus = await DB.init();
            console.log('스토리지 상태:', storageStatus);
            
            // UI 초기화
            UI.init();
            
            // 인터넷 연결 상태 모니터링
            startNetworkMonitoring();
            
            // Google 인증 정보 확인 및 초기화
            const authData = DB.getGoogleAuthData();
            if (authData && authData.clientId && authData.apiKey) {
                // Google API 초기화
                await GoogleAPI.init(authData);
            }
            
            // 앱 준비 완료 메시지
            UI.showToast('앱이 준비되었습니다.');
            
            return true;
        } catch (error) {
            console.error('앱 초기화 오류:', error);
            UI.showToast('앱 초기화 중 오류가 발생했습니다.');
            return false;
        }
    };
    
    /**
     * 네트워크 상태 모니터링
     */
    const startNetworkMonitoring = () => {
        const updateNetworkStatus = () => {
            const isOnline = navigator.onLine;
            
            // Google 관련 버튼 활성화/비활성화
            const googleButtons = document.querySelectorAll('.google-btn');
            
            googleButtons.forEach(button => {
                if (isOnline) {
                    button.removeAttribute('disabled');
                    button.style.opacity = '1';
                } else {
                    button.setAttribute('disabled', 'disabled');
                    button.style.opacity = '0.5';
                }
            });
        };
        
        // 초기 상태 설정
        updateNetworkStatus();
        
        // 이벤트 리스너 등록
        window.addEventListener('online', () => {
            updateNetworkStatus();
            UI.showToast('인터넷에 연결되었습니다.');
        });
        
        window.addEventListener('offline', () => {
            updateNetworkStatus();
            UI.showToast('인터넷 연결이 끊겼습니다.');
        });
    };
    
    /**
     * PWA 인스톨 버튼 처리
     */
    const setupInstallPrompt = () => {
        // 설치 가능한 상태인 경우 처리
        window.addEventListener('beforeinstallprompt', (e) => {
            // 설치 프롬프트 저장
            window.deferredInstallPrompt = e;
            
            // 처음 방문시 설치 안내 토스트 표시
            const hasVisited = localStorage.getItem('hasVisitedBefore');
            if (!hasVisited) {
                setTimeout(() => {
                    UI.showToast('홈 화면에 앱을 추가하면 더 편리하게 사용할 수 있습니다.', 5000);
                    localStorage.setItem('hasVisitedBefore', 'true');
                }, 3000);
            }
        });
        
        // 앱 설치 완료 이벤트
        window.addEventListener('appinstalled', () => {
            UI.showToast('앱이 홈 화면에 설치되었습니다!');
            window.deferredInstallPrompt = null;
        });
    };
    
    // 앱 초기화 실행
    await initApp();
    
    // PWA 인스톨 설정
    setupInstallPrompt();
    
})();