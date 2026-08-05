const HTTP_NOT_AUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_REQUIRED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
let tokenRefreshPromise = null;

//CSRF 방어용 쿠키에서 토큰 값 읽어오기
export const getCsrfToken = () => {
    const csrfCookie = document.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith('XSRF-TOKEN='));

    if (!csrfCookie) return null;

    return decodeURIComponent(csrfCookie.substring('XSRF-TOKEN='.length));
};

export const parseJsonSafe = async response => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const getTokenUrl = url => {
    const requestUrl = new URL(url, window.location.origin);
    return `${requestUrl.origin}/token`;
};

const isAuthRequest = url => {
    const requestUrl = new URL(url, window.location.origin);
    return ['/auth', '/token'].includes(requestUrl.pathname);
};

//쓰기 요청이면 CSRF 토큰 헤더에 붙여줄 옵션 만들기
const getRequestOptionsWithCsrf = (options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const shouldSendCsrfToken = CSRF_REQUIRED_METHODS.includes(method);
    const csrfToken = shouldSendCsrfToken ? getCsrfToken() : null;

    if (!csrfToken) return options;

    return {
        ...options,
        headers: {
            ...options.headers,
            [CSRF_HEADER_NAME]: csrfToken,
        },
    };
};

//리프레시 토큰 쿠키로 액세스 토큰 재발급
const refreshAccessToken = url => {
    if (!tokenRefreshPromise) {
        const refreshOptions = getRequestOptionsWithCsrf({
            method: 'POST',
            credentials: 'include',
        });

        tokenRefreshPromise = fetch(getTokenUrl(url), refreshOptions)
            .then(response => response.ok)
            .catch(() => false)
            .finally(() => {
                tokenRefreshPromise = null;
            });
    }

    return tokenRefreshPromise;
};

//인증 실패 응답이면 토큰 재발급 후 기존 요청 한 번 재시도
export const requestWithTokenRefresh = async (url, options = {}) => {
    const requestOptions = getRequestOptionsWithCsrf(options);
    const response = await fetch(url, requestOptions);
    if (
        ![HTTP_NOT_AUTHORIZED, HTTP_FORBIDDEN].includes(response.status) ||
        isAuthRequest(url)
    ) {
        return response;
    }

    const isRefreshed = await refreshAccessToken(url);
    if (!isRefreshed) return response;

    return fetch(url, requestOptions);
};

export const requestJson = async (url, options = {}) => {
    const response = await requestWithTokenRefresh(url, options);
    const body = await parseJsonSafe(response);
    return {
        response,
        ok: response.ok,
        status: response.status,
        code: body && body.code ? body.code : null,
        data: body && Object.prototype.hasOwnProperty.call(body, 'data')
            ? body.data
            : null,
        body,
    };
};
