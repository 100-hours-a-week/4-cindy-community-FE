import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const createPost = boardData => {
    const result = requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        body: JSON.stringify(boardData),
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    return result;
};

export const updatePost = (postId, boardData) => {
    const result = requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(boardData),
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    return result;
};

export const updatePostImages = (postId, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const result = requestJson(
        `${getServerUrl()}/posts/${postId}/images`,
        {
            method: 'PUT',
            credentials: 'include',
            body: formData,
        },
    );

    return result;
};

export const fileUpload = formData => {
    const result = requestJson(`${getServerUrl()}/images/post`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    return result;
};

export const getBoardItem = postId => {
    const result = requestJson(getServerUrl() + `/posts/${postId}`, {
        method: 'GET',
        credentials: 'include',
    });

    return result;
};

export const getPostImages = postId => {
    const result = requestJson(
        `${getServerUrl()}/posts/${postId}/images`,
        {
            method: 'GET',
            credentials: 'include',
        },
    );

    return result;
};
