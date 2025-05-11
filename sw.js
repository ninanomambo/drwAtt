// 캐시 이름 설정 (버전 관리를 위해 v1 추가)
const CACHE_NAME = 'darakwon-attendance-cache-v1';

// GitHub Pages 배포 경로
const BASE_PATH = '/drwAtt';

// 캐싱할 파일 목록
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/icon.png`,
  `${BASE_PATH}/og_image.png`,
  `${BASE_PATH}/manifest.json`
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
  // chrome-extension:// 프로토콜이나 다른 지원되지 않는 URL은 처리하지 않음
  if (!event.request.url.startsWith('http') && 
      !event.request.url.startsWith('https')) {
    return;
  }

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
            
            try {
              // 응답을 복제하여 캐시에 저장 (응답은 스트림이라 한 번만 사용 가능)
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  // URL이 http 또는 https로 시작하는지 다시 확인
                  if (event.request.url.startsWith('http') || 
                      event.request.url.startsWith('https')) {
                    cache.put(event.request, responseToCache);
                  }
                });
            } catch (error) {
              console.error('캐싱 오류:', error);
            }
              
            return response;
          })
          .catch(error => {
            console.error('네트워크 요청 실패:', error);
            // 네트워크 요청이 실패하면 오프라인 페이지 또는 기본 응답 반환
            // 여기서는 간단히 오류를 리턴
            return new Response('네트워크 오류가 발생했습니다.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
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