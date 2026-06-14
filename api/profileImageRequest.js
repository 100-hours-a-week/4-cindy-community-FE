import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

//로그인한 유저의 프로필 이미지 정보 조회
export const getProfileImage = async userId => {
    return requestJson(`${getServerUrl()}/users/${userId}/profile-image`, {
        method: 'GET',
        credentials: 'include',
    });
};

//로그인한 유저의 프로필 이미지 수정
export const updateProfileImage = async (userId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return requestJson(
        `${getServerUrl()}/users/${userId}/profile-image`,
        {
            method: 'PUT',
            credentials: 'include',
            body: formData,
        },
    );
};

//로그인한 유저의 프로필 이미지 삭제
export const deleteProfileImage = async userId => {
    return requestJson(
        `${getServerUrl()}/users/${userId}/profile-image`,
        {
            method: 'PUT',
            credentials: 'include',
        },
    );
};
