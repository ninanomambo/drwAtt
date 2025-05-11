/**
 * Darakwon Attendance Ver 0.1
 * 서비스 워커 파일
 */

// 캐시 이름
const CACHE_NAME = 'darakwon-attendance-v1';

// 캐싱할 파일 목록
const CACHE_FILES = [
    '/drwAtt/',
    '/drwAtt/index.html',
    '/drwAtt/styles.css',
    '/drwAtt/app.js',
    '/drwAtt/db.js',
    '/drwAtt/icon.png',
    '/drwAtt/favicon.ico',
    '/drwAtt/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
    console.log('서비스 워커 설치 중...');
    
    // 캐시 생성 및 파일 저장
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('파일 캐싱 중...');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                console.log('모든 파일이 캐싱되었습니다.');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('캐싱 실패:', error);
            })
    );
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
    console.log('서비스 워커 활성화 중...');
    
    // 이전 캐시 정리
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('이전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('서비스 워커가 활성화되었습니다.');
            return self.clients.claim();
        })
    );
});

// 요청 캐싱 및 네트워크 우선 전략
self.addEventListener('fetch', (event) => {
    // 데이터 API 요청은 네트워크 우선 사용
    if (event.request.url.includes('api.')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // 일반 리소스는 캐시 우선, 없으면 네트워크 사용
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(event.request)
                    .then((response) => {
                        // 유효한 응답만 캐시
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // 응답 복제 (스트림은 한 번만 사용 가능)
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // 오프라인 폴백 페이지 제공 (필요시)
                        if (event.request.mode === 'navigate') {
                            return caches.match('/drwAtt/index.html');
                        }
                        
                        return new Response('네트워크 연결이 필요합니다.', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// 백그라운드 동기화
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-attendance') {
        console.log('백그라운드 동기화 작업:', event.tag);
        // 여기서 필요한 백그라운드 동기화 작업 수행
    }
});

// 푸시 알림
self.addEventListener('push', (event) => {
    const options = {
        body: event.data.text(),
        icon: '/drwAtt/icon.png',
        badge: '/drwAtt/icon.png',
        vibrate: [100, 50, 100],
        data: {
            url: '/drwAtt/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('다락원 출퇴근 알림', options)
    );
});

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});