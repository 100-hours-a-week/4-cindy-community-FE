import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userSignup = async data => {
    const result = await requestJson(`${getServerUrl()}/users`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    return result;
};

export const fileUpload = async formData => {
    const result = await requestJson(
        `${getServerUrl()}/images/profile`,
        {
            method: 'POST',
            credentials: 'include',
            body: formData,
        },
    );
    return result;
};
