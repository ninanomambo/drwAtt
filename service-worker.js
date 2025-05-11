/**
 * Darakwon Attendance 앱 서비스 워커
 * PWA 오프라인 기능 지원
 */

// 캐시 이름 및 버전
const CACHE_NAME = 'darakwon-attendance-cache-v1';

// 캐시할 파일 목록
const CACHE_FILES = [
  '/drwAtt/',
  '/drwAtt/index.html',
  '/drwAtt/css/style.css',
  '/drwAtt/js/app.js',
  '/drwAtt/js/db.js',
  '/drwAtt/js/ui.js',
  '/drwAtt/js/googleApi.js',
  '/drwAtt/icon.png',
  '/drwAtt/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js'
];

// 서비스 워커 설치
self.addEventListener('install', (event) => {
  // 기존 서비스 워커 즉시 활성화
  self.skipWaiting();
  
  // 캐시 초기화 및 파일 저장
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('서비스 워커: 캐시 초기화 및 파일 저장');
        return cache.addAll(CACHE_FILES);
      })
  );
});

// 서비스 워커 활성화
self.addEventListener('activate', (event) => {
  console.log('서비스 워커: 활성화');
  
  // 이전 버전의 캐시 삭제
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('서비스 워커: 이전 캐시 삭제 -', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 모든 클라이언트에서 즉시 서비스 워커 제어 시작
  return self.clients.claim();
});

// 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  // Google Drive API 요청은 캐싱하지 않음
  if (event.request.url.includes('googleapis.com')) {
    return;
  }
  
  // API 요청은 캐싱하지 않음
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // CDNJS 요청은 네트워크 우선 전략 사용
  if (event.request.url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // 기본 캐시 우선 전략 - 캐시에서 찾고, 없으면 네트워크에서 요청
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에서 찾았으면 해당 응답 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크에 요청
        return fetch(event.request)
          .then((networkResponse) => {
            // 유효한 응답인지 확인
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // 응답 복제 후 캐시에 저장
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('네트워크 요청 실패:', error);
            // 네트워크 오류 시 오프라인 페이지 반환
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/drwAtt/index.html');
            }
          });
      })
  );
});

// 백그라운드 동기화 이벤트 처리
self.addEventListener('sync', (event) => {
  if (event.tag === 'attendance-sync') {
    console.log('백그라운드 동기화: 출퇴근 데이터 동기화');
    
    // TODO: 필요시 동기화 로직 구현
    event.waitUntil(
      // 동기화 로직
      Promise.resolve()
    );
  }
});

// 푸시 알림 이벤트 처리
self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event.data.text());
  
  const options = {
    body: event.data.text(),
    icon: '/drwAtt/icon.png',
    badge: '/drwAtt/icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/drwAtt/index.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('다락원 출퇴근', options)
  );
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // 이미 열린 탭이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes('/drwAtt/') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 열린 탭이 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow('/drwAtt/index.html');
        }
      })
  );
});