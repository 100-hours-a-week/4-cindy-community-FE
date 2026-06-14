import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

//로그인한 유저의 회원정보 조회
export const getUserInfo = async userId => {
    return requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'GET',
        credentials: 'include',
    });
};

export const userModify = async (userId, nickname) => {
    const result = await requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ nickname }),
    });
    return result;
};

export const userDelete = async () => {
    const result = await requestJson(`${getServerUrl()}/v1/users/me`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    return result;
};
