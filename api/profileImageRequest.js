import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

//로그인한 유저의 프로필 이미지 정보 조회
export const getProfileImage = async userId => {
    return requestJson(`${getServerUrl()}/users/${userId}/profile-image`, {
        method: 'GET',
        credentials: 'include',
    });
};
