import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

//로그아웃
export const logout = async () => {
    return requestJson(`${getServerUrl()}/auth`, {
        method: 'DELETE',
        credentials: 'include',
    });
};
