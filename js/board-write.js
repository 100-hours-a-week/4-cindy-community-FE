import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getQueryString,
    prependChild,
} from '../utils/function.js';
import {
    createPost,
    fileUpload,
    updatePost,
    updatePostImages,
    getBoardItem,
    getPostImages,
} from '../api/board-writeRequest.js';
import { getProfileImage } from '../api/profileImageRequest.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;

const MAX_TITLE_LENGTH = 26;
const MAX_CONTENT_LENGTH = 1500;

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const MAX_IMAGE_COUNT = 2;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewText = document.getElementById('imagePreviewText');
const contentHelpElement = document.querySelector(
    '.inputBox p[name="content"]',
);

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let modifyData = {};
let selectedImageFiles = [];
let existingPostImages = [];
let isPostImageChanged = false;
let isSubmitting = false;

const showExistingPostImages = () => {
    if (!isModifyMode || existingPostImages.length === 0) {
        imagePreviewText.style.display = 'none';
        return;
    }

    imagePreviewText.innerHTML = `기존 이미지 ${existingPostImages.length}장 <span class="deleteFile">X</span>`;
    imagePreviewText.style.display = 'block';
};

const observeSignupData = () => {
    const { title, content } = boardWrite;
    if (!title || !content || title === '' || content === '') {
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#E8CBD4';
    } else {
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#D94F70';
    }
};

// 엘리먼트 값 가져오기 title, content
const getBoardData = () => {
    return {
        title: boardWrite.title,
        content: boardWrite.content,
    };
};

// 버튼 클릭시 이벤트
const addBoard = async () => {
    if (isSubmitting) return;

    const boardData = getBoardData();

    // boardData가 false일 경우 함수 종료
    if (!boardData) return Dialog('게시글', '게시글을 입력해주세요.');

    if (boardData.title.length > MAX_TITLE_LENGTH)
        return Dialog('게시글', '제목은 26자 이하로 입력해주세요.');

    if (!isModifyMode) {
        isSubmitting = true;
        submitButton.disabled = true;

        //1.선택한 게시글 이미지가 있으면 파일 먼저 업로드
        if (selectedImageFiles.length > 0) {
            const formData = new FormData();
            selectedImageFiles.forEach(file => formData.append('files', file));

            const imageResult = await fileUpload(formData);
            if (!imageResult.ok) {
                Dialog('게시글', '이미지 업로드에 실패했습니다.');
                isSubmitting = false;
                observeSignupData();
                return;
            }

            //2.업로드 응답의 파일명을 게시글 작성 요청에 추가
            boardData.jpgPaths = imageResult.data.map(image => image.jpgPath);
            boardData.webpPaths = imageResult.data.map(
                image => image.webpPath,
            );
        }

        //3.게시글 내용과 업로드된 이미지 파일명으로 게시글 작성
        const { ok, status, data } = await createPost(boardData);
        if (!ok) {
            Dialog('게시글', '게시글 작성에 실패했습니다.');
            isSubmitting = false;
            observeSignupData();
            return;
        }

        if (status === HTTP_CREATED) {
            window.location.href = `/html/board.html?id=${data.postId}`;
        } else {
            const helperElement = contentHelpElement;
            helperElement.textContent = '제목, 내용을 모두 작성해주세요.';
            isSubmitting = false;
            observeSignupData();
        }
    } else {
        isSubmitting = true;
        submitButton.disabled = true;

        const postId = getQueryString('postId');
        const { ok, status } = await updatePost(postId, boardData);

        if (!ok || status !== HTTP_OK) {
            Dialog('게시글', '게시글 수정에 실패했습니다.');
            isSubmitting = false;
            observeSignupData();
            return;
        }

        //게시글 이미지가 변경된 경우 전체 교체 또는 삭제
        if (isPostImageChanged) {
            const imageResult = await updatePostImages(
                postId,
                selectedImageFiles,
            );
            if (!imageResult.ok) {
                Dialog('게시글', '게시글 이미지를 수정하지 못했습니다.');
                isSubmitting = false;
                observeSignupData();
                return;
            }
        }

        window.location.href = `/html/board.html?id=${postId}`;
    }
};
const changeEventHandler = async (event, uid) => {
    if (uid == 'title') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '제목을 입력해주세요.';
        } else if (value.length > MAX_TITLE_LENGTH) {
            helperElement.textContent = '제목은 26자 이하로 입력해주세요.';
            titleInput.value = value.substring(0, MAX_TITLE_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_TITLE_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'content') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '내용을 입력해주세요.';
        } else if (value.length > MAX_CONTENT_LENGTH) {
            helperElement.textContent = '내용은 1500자 이하로 입력해주세요.';
            contentInput.value = value.substring(0, MAX_CONTENT_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_CONTENT_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'image') {
        const files = Array.from(event.target.files);

        //게시글 이미지는 최대 2장까지 선택 가능
        if (files.length > MAX_IMAGE_COUNT) {
            Dialog('이미지 선택 실패', '이미지는 최대 2장까지 선택할 수 있습니다.');
            event.target.value = '';
            selectedImageFiles = [];
            showExistingPostImages();
            return;
        }

        //파일당 최대 크기는 백엔드와 동일하게 10MB로 제한
        if (files.some(file => file.size > MAX_IMAGE_SIZE)) {
            Dialog('이미지 선택 실패', '이미지는 파일당 10MB 이하여야 합니다.');
            event.target.value = '';
            selectedImageFiles = [];
            showExistingPostImages();
            return;
        }

        selectedImageFiles = files;
        if (isModifyMode) isPostImageChanged = true;
        if (files.length > 0) {
            imagePreviewText.textContent = files
                .map(file => file.name)
                .join(', ');
            imagePreviewText.style.display = 'block';
        } else {
            imagePreviewText.style.display = 'none';
        }
    } else if (uid === 'imagePreviewText') {
        selectedImageFiles = [];
        imageInput.value = '';
        imagePreviewText.style.display = 'none';
        if (isModifyMode) isPostImageChanged = true;
    }

    observeSignupData();
};
// 수정모드시 사용하는 게시글 단건 정보 가져오기
const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok) throw new Error('서버 응답 오류');
    return data;
};

//수정모드시 사용하는 게시글 이미지 목록 가져오기
const getBoardModifyImages = async postId => {
    const { ok, data } = await getPostImages(postId);
    if (!ok || !Array.isArray(data)) {
        throw new Error('게시글 이미지 정보를 가져오는데 실패하였습니다.');
    }
    return data;
};

// 수정 모드인지 확인
const checkModifyMode = () => {
    const postId = getQueryString('postId');
    if (!postId) return false;
    return postId;
};

// 이벤트 등록
const addEvent = () => {
    submitButton.addEventListener('click', addBoard);
    titleInput.addEventListener('input', event =>
        changeEventHandler(event, 'title'),
    );
    contentInput.addEventListener('input', event =>
        changeEventHandler(event, 'content'),
    );
    imageInput.addEventListener('change', event =>
        changeEventHandler(event, 'image'),
    );
    if (imagePreviewText !== null) {
        imagePreviewText.addEventListener('click', event =>
            changeEventHandler(event, 'imagePreviewText'),
        );
    }
};

const setModifyData = (data, postImages) => {
    titleInput.value = data.title;
    contentInput.value = data.content;

    existingPostImages = postImages;
    if (existingPostImages.length > 0) {
        //기존 게시글 이미지 개수 표시
        showExistingPostImages();
    } else {
        // 이미지 파일이 없으면 미리보기 숨김
        imagePreviewText.style.display = 'none';
    }

    boardWrite.title = data.title;
    boardWrite.content = data.content;

    observeSignupData();
};

const init = async () => {
    const dataResponse = await authCheck();
    if (!dataResponse) return;

    const data = await dataResponse.json();
    const modifyId = checkModifyMode();

    //헤더에서 사용할 로그인 유저의 프로필 썸네일 조회
    const profileImageResult = await getProfileImage(data.data.userId);
    const profileImage =
        profileImageResult.ok && profileImageResult.data.thumbnailUrl
            ? profileImageResult.data.thumbnailUrl
            : DEFAULT_PROFILE_IMAGE;

    prependChild(document.body, Header('Dessert Log 🍰', 1, profileImage));

    if (modifyId) {
        isModifyMode = true;
        const [postData, postImages] = await Promise.all([
            getBoardModifyData(modifyId),
            getBoardModifyImages(modifyId),
        ]);
        modifyData = postData;

        if (data.data.nickname !== modifyData.nickname) {
            Dialog('권한 없음', '권한이 없습니다.', () => {
                window.location.href = '/';
            });
        } else {
            setModifyData(modifyData, postImages);
        }
    }

    addEvent();
};

init().catch(error => {
    console.error('게시글 작성 화면 초기화 실패:', error);
});
