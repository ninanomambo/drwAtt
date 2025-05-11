// 캐시 이름 설정 (버전 관리를 위해 v1 추가)
const CACHE_NAME = 'darakwon-attendance-cache-v1';

// 캐싱할 파일 목록
const urlsToCache = [
  '/drwAtt/',
  '/drwAtt/index.html',
  '/drwAtt/icon.png',
  '/drwAtt/og_image.png'
];

// Service Worker 설치 시 캐시 등록
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('캐시 생성 완료');
        return cache.addAll(urlsToCache);
      })
  );
});

// 네트워크 요청 가로채기 및 캐시 사용
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크 요청
        return fetch(event.request)
          .then(response => {
            // 유효한 응답이 아니면 그냥 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 응답을 복제하여 캐시에 저장 (응답은 스트림이라 한 번만 사용 가능)
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
      })
  );
});

// 서비스 워커 활성화 시 이전 캐시 삭제
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // 불필요한 이전 캐시 삭제
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});