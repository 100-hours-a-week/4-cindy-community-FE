const HTTP_NOT_AUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
let tokenRefreshPromise = null;

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

//리프레시 토큰 쿠키로 액세스 토큰 재발급
const refreshAccessToken = url => {
    if (!tokenRefreshPromise) {
        tokenRefreshPromise = fetch(getTokenUrl(url), {
            method: 'POST',
            credentials: 'include',
        })
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
    const response = await fetch(url, options);
    if (
        ![HTTP_NOT_AUTHORIZED, HTTP_FORBIDDEN].includes(response.status) ||
        isAuthRequest(url)
    ) {
        return response;
    }

    const isRefreshed = await refreshAccessToken(url);
    if (!isRefreshed) return response;

    return fetch(url, options);
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
