/**
 * Google Drive API 연동 모듈
 * 구글 드라이브를 통한 백업 및 복원 기능 제공
 */
const GoogleAPI = (() => {
    // 구글 API 인증 및 설정
    let apiConfig = {
        clientId: null,
        apiKey: null,
        scopes: 'https://www.googleapis.com/auth/drive.file',
        isAuthorized: false
    };
    
    // 파일 정보
    const FILE_NAME = 'darakwon-attendance-backup.json';
    const FILE_MIME_TYPE = 'application/json';
    
    /**
     * Google API 초기화
     * @param {Object} authData - Google API 인증 정보
     */
    const init = async (authData) => {
        if (!authData || !authData.clientId || !authData.apiKey) {
            console.error('Google API 인증 정보가 누락되었습니다.');
            return false;
        }
        
        apiConfig.clientId = authData.clientId;
        apiConfig.apiKey = authData.apiKey;
        
        try {
            // Google API 클라이언트 로드
            await loadGoogleApiClient();
            return true;
        } catch (error) {
            console.error('Google API 초기화 오류:', error);
            return false;
        }
    };
    
    /**
     * Google API 클라이언트 로드
     * @returns {Promise} 로드 완료 시 resolve
     */
    const loadGoogleApiClient = () => {
        return new Promise((resolve, reject) => {
            // 이미 로드되었는지 확인
            if (window.gapi && window.gapi.client) {
                resolve();
                return;
            }
            
            // Google API 스크립트 로드
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gapi/1.0.4/gapi-client.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                if (!window.gapi) {
                    reject(new Error('Google API 클라이언트 로드 실패'));
                    return;
                }
                
                // API 클라이언트 초기화
                window.gapi.load('client:auth2', async () => {
                    try {
                        await window.gapi.client.init({
                            apiKey: apiConfig.apiKey,
                            clientId: apiConfig.clientId,
                            scope: apiConfig.scopes,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                        });
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            };
            
            script.onerror = () => {
                reject(new Error('Google API 스크립트 로드 실패'));
            };
            
            document.body.appendChild(script);
        });
    };
    
    /**
     * 사용자 인증
     * @returns {Promise} 인증 완료 시 resolve
     */
    const authenticate = async () => {
        if (!window.gapi || !window.gapi.auth2) {
            throw new Error('Google API 클라이언트가 초기화되지 않았습니다.');
        }
        
        const authInstance = window.gapi.auth2.getAuthInstance();
        
        // 이미 인증된 경우
        if (authInstance.isSignedIn.get()) {
            apiConfig.isAuthorized = true;
            return true;
        }
        
        // 인증 시도
        try {
            const user = await authInstance.signIn();
            apiConfig.isAuthorized = true;
            return true;
        } catch (error) {
            console.error('Google 인증 오류:', error);
            apiConfig.isAuthorized = false;
            throw error;
        }
    };
    
    /**
     * 파일 ID로 파일 찾기
     * @param {string} fileId - 파일 ID
     * @returns {Promise<Object>} 파일 정보
     */
    const getFileById = async (fileId) => {
        if (!apiConfig.isAuthorized) {
            await authenticate();
        }
        
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id,name,mimeType'
            });
            
            return response.result;
        } catch (error) {
            console.error('파일 조회 오류:', error);
            throw error;
        }
    };
    
    /**
     * 파일 이름으로 파일 찾기
     * @param {string} fileName - 찾을 파일 이름
     * @returns {Promise<Object>} 파일 정보
     */
    const findFileByName = async (fileName) => {
        if (!apiConfig.isAuthorized) {
            await authenticate();
        }
        
        try {
            const response = await window.gapi.client.drive.files.list({
                q: `name='${fileName}' and trashed=false`,
                fields: 'files(id,name,mimeType)'
            });
            
            const files = response.result.files;
            
            if (files && files.length > 0) {
                return files[0];
            } else {
                return null;
            }
        } catch (error) {
            console.error('파일 검색 오류:', error);
            throw error;
        }
    };
    
    /**
     * 파일 내용 조회
     * @param {string} fileId - 파일 ID
     * @returns {Promise<Object>} 파일 내용
     */
    const getFileContent = async (fileId) => {
        if (!apiConfig.isAuthorized) {
            await authenticate();
        }
        
        try {
            const response = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            return response.result;
        } catch (error) {
            console.error('파일 내용 조회 오류:', error);
            throw error;
        }
    };
    
    /**
     * 파일 생성
     * @param {string} fileName - 파일 이름
     * @param {string} content - 파일 내용
     * @param {string} mimeType - 파일 MIME 타입
     * @returns {Promise<Object>} 생성된 파일 정보
     */
    const createFile = async (fileName, content, mimeType) => {
        if (!apiConfig.isAuthorized) {
            await authenticate();
        }
        
        const metadata = {
            name: fileName,
            mimeType: mimeType
        };
        
        try {
            // 파일 메타데이터 설정
            const fileContent = JSON.stringify(content);
            const file = new Blob([fileContent], { type: mimeType });
            
            // 폼 데이터 생성
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);
            
            // API 요청 헤더 설정
            const token = window.gapi.auth.getToken().access_token;
            const headers = new Headers({
                'Authorization': `Bearer ${token}`
            });
            
            // 파일 업로드 요청
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: headers,
                body: form
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            return result;
        } catch (error) {
            console.error('파일 생성 오류:', error);
            throw error;
        }
    };
    
    /**
     * 파일 업데이트
     * @param {string} fileId - 파일 ID
     * @param {string} content - 새 파일 내용
     * @returns {Promise<Object>} 업데이트된 파일 정보
     */
    const updateFile = async (fileId, content) => {
        if (!apiConfig.isAuthorized) {
            await authenticate();
        }
        
        try {
            // 파일 내용 설정
            const fileContent = JSON.stringify(content);
            const file = new Blob([fileContent], { type: FILE_MIME_TYPE });
            
            // API 요청 헤더 설정
            const token = window.gapi.auth.getToken().access_token;
            const headers = new Headers({
                'Authorization': `Bearer ${token}`
            });
            
            // 파일 업데이트 요청
            const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: headers,
                body: file
            });
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message);
            }
            
            return result;
        } catch (error) {
            console.error('파일 업데이트 오류:', error);
            throw error;
        }
    };
    
    /**
     * Google 드라이브에 데이터 백업
     * @param {Array} data - 백업할 데이터 배열
     * @returns {Promise<Object>} 백업 결과
     */
    const backupToGoogleDrive = async (data) => {
        try {
            // 인증 확인
            if (!apiConfig.isAuthorized) {
                await authenticate();
            }
            
            // 기존 파일 확인
            const fileId = DB.getGoogleFileId();
            let file = null;
            
            if (fileId) {
                try {
                    file = await getFileById(fileId);
                } catch (error) {
                    console.log('기존 파일을 찾을 수 없습니다. 새 파일을 생성합니다.');
                }
            }
            
            if (!file) {
                // 파일 이름으로 검색
                file = await findFileByName(FILE_NAME);
            }
            
            // 파일 존재 여부에 따라 생성 또는 업데이트
            let result;
            
            if (file) {
                // 파일 업데이트
                result = await updateFile(file.id, data);
                result.id = file.id; // 업데이트 결과에 ID가 없을 수 있으므로 추가
            } else {
                // 새 파일 생성
                result = await createFile(FILE_NAME, data, FILE_MIME_TYPE);
            }
            
            // 파일 ID 저장
            if (result.id) {
                DB.saveGoogleFileId(result.id);
            }
            
            return {
                success: true,
                fileId: result.id
            };
        } catch (error) {
            console.error('Google 드라이브 백업 오류:', error);
            return {
                success: false,
                error: error.message || '백업 중 오류가 발생했습니다.'
            };
        }
    };
    
    /**
     * Google 드라이브에서 데이터 복원
     * @returns {Promise<Object>} 복원 결과 및 데이터
     */
    const restoreFromGoogleDrive = async () => {
        try {
            // 인증 확인
            if (!apiConfig.isAuthorized) {
                await authenticate();
            }
            
            // 파일 ID 확인
            let fileId = DB.getGoogleFileId();
            let file = null;
            
            if (fileId) {
                try {
                    file = await getFileById(fileId);
                } catch (error) {
                    console.log('저장된 파일 ID로 파일을 찾을 수 없습니다. 파일 이름으로 검색합니다.');
                }
            }
            
            if (!file) {
                // 파일 이름으로 검색
                file = await findFileByName(FILE_NAME);
                
                if (!file) {
                    return {
                        success: false,
                        error: '백업 파일을 찾을 수 없습니다.'
                    };
                }
                
                // 새 파일 ID 저장
                DB.saveGoogleFileId(file.id);
            }
            
            // 파일 내용 가져오기
            const content = await getFileContent(file.id);
            
            return {
                success: true,
                data: content
            };
        } catch (error) {
            console.error('Google 드라이브 복원 오류:', error);
            return {
                success: false,
                error: error.message || '복원 중 오류가 발생했습니다.'
            };
        }
    };
    
    // 공개 API
    return {
        init,
        authenticate,
        backupToGoogleDrive,
        restoreFromGoogleDrive
    };
})();