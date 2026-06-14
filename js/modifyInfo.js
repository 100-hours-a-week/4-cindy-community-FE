import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    prependChild,
    getServerUrl,
    resolveImageUrl,
    validNickname,
} from '../utils/function.js';
import {
    getUserInfo,
    userModify,
    userDelete,
} from '../api/modifyInfoRequest.js';
import { getProfileImage } from '../api/profileImageRequest.js';
import { requestJson } from '../utils/request.js';

const emailTextElement = document.querySelector('#id');
const nicknameInputElement = document.querySelector('#nickname');
const profileInputElement = document.querySelector('#profile');
const withdrawBtnElement = document.querySelector('#withdrawBtn');
const nicknameHelpElement = document.querySelector(
    '.inputBox p[name="nickname"]',
);
const resultElement = document.querySelector('.inputBox p[name="result"]');
const modifyBtnElement = document.querySelector('#signupBtn');
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');
let authData = {
    data: {
        nickname: '',
        profileImageUrl: null,
    },
};
const changeData = {
    nickname: '',
    profileImageUrl: null,
};

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_OK = 200;
const HTTP_CREATED = 201;

const setData = data => {
    //프로필 이미지 조회 실패 시 기본 이미지로 대체
    profilePreview.addEventListener(
        'error',
        () => {
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
        },
        { once: true },
    );

    if (data.profileImageUrl === null) {
        profilePreview.src = DEFAULT_PROFILE_IMAGE;
        if (removeProfileButton) removeProfileButton.style.display = 'none';
    } else {
        profilePreview.src = data.profileImageUrl;
        if (removeProfileButton) removeProfileButton.style.display = 'flex';
    }

    //회원정보 조회 API에서 받은 이메일 표시
    emailTextElement.textContent = data.email;
    nicknameInputElement.value = data.nickname;
};

const observeData = () => {
    const button = document.querySelector('#signupBtn');
    if (
        authData.data.nickname !== changeData.nickname ||
        authData.data.profileImageUrl !== changeData.profileImageUrl
    ) {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    } else {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    }
};

const changeEventHandler = async (event, uid) => {
    const button = document.querySelector('#signupBtn');
    if (uid == 'nickname') {
        const value = event.target.value;
        const isValidNickname = validNickname(value);
        const helperElement = nicknameHelpElement;
        let isComplete = false;
        if (value == '' || value == null) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
        } else if (!isValidNickname) {
            helperElement.textContent =
                '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.';
        } else {
            helperElement.textContent = '';
            isComplete = true;
        }
        if (isComplete) {
            changeData.nickname = value;
        } else {
            changeData.nickname = authData.data.nickname;
        }
    } else if (uid == 'profile') {
        // 사용자가 선택한 파일
        const file = event.target.files[0];
        console.log(changeData.profileImageUrl);
        if (!file) {
            localStorage.removeItem('profileImageUrl');
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            if (removeProfileButton) removeProfileButton.style.display = 'none';
        } else {
            const formData = new FormData();
            formData.append('profileImage', file);

            // 파일 업로드를 위한 POST 요청 실행
            try {
                const { ok, data } = await requestJson(
                    `${getServerUrl()}/v1/users/upload/profile-image`,
                    {
                        method: 'POST',
                        body: formData,
                    },
                );

                if (!ok) throw new Error('서버 응답 오류');
                localStorage.setItem(
                    'profileImageUrl',
                    data.profileImageUrl,
                );
                changeData.profileImageUrl = data.profileImageUrl;
                profilePreview.src = resolveImageUrl(
                    data.profileImageUrl,
                    DEFAULT_PROFILE_IMAGE,
                );
                if (removeProfileButton)
                    removeProfileButton.style.display = 'flex';
            } catch (error) {
                console.error('업로드 중 오류 발생:', error);
            }
        }
    }
    observeData();
};

const sendModifyData = async () => {
    const button = document.querySelector('#signupBtn');

    if (!button.disabled) {
        if (changeData.nickname === '') {
            Dialog('필수 정보 누락', '닉네임을 입력해주세요.');
        } else {
            const { status } = await userModify(changeData);

            if (status === HTTP_CREATED) {
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정완료');
                location.href = '/html/modifyInfo.html';
            } else {
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정실패');
                location.href = '/html/modifyInfo.html';
            }
        }
    }
};

// 회원 탈퇴
const deleteAccount = async () => {
    const callback = async () => {
        const { status } = await userDelete();

        if (status === HTTP_OK) {
            try {
                await requestJson(`${getServerUrl()}/v1/auth/logout`, {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('로그아웃 요청 실패:', error);
            }
            location.href = '/html/login.html';
        } else {
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
        }
    };

    Dialog(
        '회원탈퇴 하시겠습니까?',
        '작성된 게시글과 댓글은 삭제 됩니다.',
        callback,
    );
};

const addEvent = () => {
    nicknameInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'nickname'),
    );
    profileInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'profile'),
    );
    if (removeProfileButton) {
        removeProfileButton.addEventListener('click', () => {
            localStorage.removeItem('profileImageUrl');
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            profileInputElement.value = '';
            removeProfileButton.style.display = 'none';
            observeData();
        });
    }
    modifyBtnElement.addEventListener('click', async () => sendModifyData());
    withdrawBtnElement.addEventListener('click', async () => deleteAccount());
};

const showToast = (message, duration = 3000, callback = null) => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toastMessage');
    toast.textContent = message;

    container.appendChild(toast);

    // 메시지를 보여주기
    setTimeout(() => {
        toast.style.opacity = 1;
        // 조금 더 위로 올라가는 효과를 줄 수 있음
        toast.style.bottom = '30px';
    }, 100);

    // 메시지 숨기기 및 콜백 실행
    setTimeout(() => {
        toast.style.opacity = 0;
        // 원래 위치로 돌아가며 사라지는 효과
        toast.style.bottom = '20px';
        setTimeout(() => {
            // 페이드 아웃이 끝난 후 요소 제거
            toast.remove();
            // 콜백 함수가 있으면 실행
            if (callback) callback();
        }, 500); // CSS transition 시간에 맞춰 설정
    }, duration);
};

const saveToastMessage = message => {
    sessionStorage.setItem('toastMessage', message);
};

// 토스트 메시지 표시 및 저장소에서 삭제
const displayToastFromStorage = () => {
    const message = sessionStorage.getItem('toastMessage');
    if (message) {
        showToast(message, 3000, () => {
            // 메시지 삭제
            sessionStorage.removeItem('toastMessage');
        }); // 메시지를 표시하는 기존 함수 사용
    }
};

const init = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        location.href = '/html/login.html';
        return;
    }

    //1.로그인한 유저의 회원정보 조회
    const userInfoResult = await getUserInfo(userId);
    if (!userInfoResult.ok) {
        location.href = '/html/login.html';
        return;
    }

    //2.회원정보 수정 화면에서 사용할 프로필 이미지 조회
    const profileImageResult = await getProfileImage(userId);
    const profileImageUrl =
        profileImageResult.ok && profileImageResult.data.webpUrl
            ? profileImageResult.data.webpUrl
            : null;
    const thumbnailUrl =
        profileImageResult.ok && profileImageResult.data.thumbnailUrl
            ? profileImageResult.data.thumbnailUrl
            : DEFAULT_PROFILE_IMAGE;

    //3.조회한 회원정보를 화면과 변경 감지 데이터에 저장
    authData = {
        data: {
            ...userInfoResult.data,
            profileImageUrl,
        },
    };
    changeData.nickname = authData.data.nickname;
    changeData.profileImageUrl = authData.data.profileImageUrl;

    prependChild(document.body, Header('커뮤니티', 2, thumbnailUrl));
    setData(authData.data);
    observeData();
    addEvent();
    displayToastFromStorage();
};

init().catch(error => {
    console.error('회원정보 조회 중 오류 발생:', error);
});
