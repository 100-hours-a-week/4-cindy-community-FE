import { changePassword } from '../api/modifyPasswordRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getServerUrl,
    prependChild,
    validPassword,
} from '../utils/function.js';
import { getProfileImage } from '../api/profileImageRequest.js';

const button = document.querySelector('#signupBtn');

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';

const modifyData = {
    password: '',
    confirmPassword: '',
};

const observeData = () => {
    const { password, confirmPassword } = modifyData;

    //비밀번호와 비밀번호 확인이 유효하고 일치하는지 확인
    if (!password || !confirmPassword || password !== confirmPassword) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const blurEventHandler = async (event, uid) => {
    if (uid == 'pw') {
        const value = event.target.value;
        const isValidPassword = validPassword(value);
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const helperElementCheck = document.querySelector(
            `.inputBox p[name="pwck"]`,
        );

        if (!helperElement) return;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
            modifyData.password = '';
        } else if (!isValidPassword) {
            helperElement.textContent =
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
            modifyData.password = '';
        } else {
            helperElement.textContent = '';
            modifyData.password = value;
        }
    } else if (uid == 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        // pw 입력란의 현재 값
        const password = modifyData.password;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호 한번 더 입력해주세요.';
            modifyData.confirmPassword = '';
        } else if (password !== value) {
            helperElement.textContent = '*비밀번호가 다릅니다.';
            modifyData.confirmPassword = '';
        } else {
            helperElement.textContent = '';
            modifyData.confirmPassword = value;
        }
    }

    observeData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');
    InputElement.forEach(element => {
        const id = element.id;

        element.addEventListener('input', event => blurEventHandler(event, id));
    });
};

const modifyPassword = async () => {
    const userId = localStorage.getItem('userId');
    const { password, confirmPassword } = modifyData;

    //현재 로그인한 유저의 비밀번호 수정 요청
    const result = await changePassword(userId, password, confirmPassword);

    if (result.ok) {
        try {
            await fetch(`${getServerUrl()}/auth`, {
                method: 'DELETE',
                credentials: 'include',
            });
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
        }
        localStorage.clear();
        location.href = '/html/login.html';
    } else {
        const message =
            result.code === 'PASSWORD_MISMATCH'
                ? '비밀번호가 일치하지 않습니다.'
                : '비밀번호 규칙을 다시 확인해주세요.';
        Dialog('비밀번호 변경 실패', message);
    }
};

const init = async () => {
    const dataResponse = await authCheck();
    if (!dataResponse) return;

    const data = await dataResponse.json();
    const userId = data.data.userId;

    //헤더에서 사용할 로그인 유저의 프로필 썸네일 조회
    const profileImageResult = await getProfileImage(userId);
    const profileImage =
        profileImageResult.ok && profileImageResult.data.thumbnailUrl
            ? profileImageResult.data.thumbnailUrl
            : DEFAULT_PROFILE_IMAGE;

    button.addEventListener('click', modifyPassword);
    prependChild(document.body, Header('커뮤니티', 1, profileImage));
    addEventForInputElements();
    observeData();
};

init().catch(error => {
    console.error('비밀번호 수정 화면 초기화 실패:', error);
});
