import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (offset, limit) => {
    const result = requestJson(
        `${getServerUrl()}/posts?offset=${offset}&limit=${limit}`,
        {
            credentials: 'include',
        },
    );
    return result;
};

export const getTrendingPosts = (page, size) => {
    const result = requestJson(
        `${getServerUrl()}/posts/trending?page=${page}&size=${size}`,
        {
            credentials: 'include',
        },
    );
    return result;
};
