import CommentItem from '../component/comment/comment.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getProfileImageFileUrl,
    prependChild,
    padTo2Digits,
    resolveImageUrl,
} from '../utils/function.js';
import {
    getPost,
    getPostImages,
    deletePost,
    writeComment,
    getComments,
    getPostLikes,
    likePost,
    unlikePost,
} from '../api/boardRequest.js';
import { getProfileImage } from '../api/profileImageRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const MAX_COMMENT_LENGTH = 255;
const HTTP_NOT_AUTHORIZED = 401;
const HTTP_OK = 200;

const formatCount = value => {
    const count = Number(value);
    if (!Number.isFinite(count)) return value ?? '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
};

const setLikeButtonState = (button, isLiked) => {
    button.classList.toggle('is-active', isLiked);
    button.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
};

const getQueryString = name => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

const getBoardDetail = async postId => {
    const { ok, data } = await getPost(postId);
    if (!ok) {
        throw new Error('게시글 정보를 가져오는데 실패하였습니다.');
    }
    return data;
};

const getBoardImages = async postId => {
    const { ok, data } = await getPostImages(postId);
    if (!ok || !Array.isArray(data)) return [];
    return data;
};

const getBoardLikes = async postId => {
    const { ok, data } = await getPostLikes(postId);
    if (!ok) {
        throw new Error('좋아요 정보를 가져오는데 실패하였습니다.');
    }
    return data;
};

const setBoardDetail = (
    data,
    postImages,
    likeData,
    writerProfileImage,
) => {
    // 헤드 정보
    const titleElement = document.querySelector('.title');
    const createdAtElement = document.querySelector('.createdAt');
    const imgElement = document.querySelector('.img');
    const nicknameElement = document.querySelector('.nickname');

    titleElement.textContent = data.title;
    const date = new Date(data.createdAt);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;
    createdAtElement.textContent = formattedDate;

    imgElement.src = resolveImageUrl(
        writerProfileImage,
        DEFAULT_PROFILE_IMAGE,
    );
    //프로필 이미지 조회 실패 시 기본 이미지로 대체
    imgElement.onerror = () => {
        imgElement.onerror = null;
        imgElement.src = DEFAULT_PROFILE_IMAGE;
    };

    nicknameElement.textContent = data.nickname;

    // 바디 정보
    const contentImgElement = document.querySelector('.contentImg');
    postImages.forEach((image, index) => {
        const jpgUrl = resolveImageUrl(image.jpgUrl);
        const webpUrl = resolveImageUrl(image.webpUrl);
        if (!jpgUrl && !webpUrl) return;

        //webp 이미지를 우선 조회하고 지원하지 않으면 jpg 이미지 사용
        const picture = document.createElement('picture');
        if (webpUrl) {
            const source = document.createElement('source');
            source.srcset = webpUrl;
            source.type = 'image/webp';
            picture.appendChild(source);
        }

        const img = document.createElement('img');
        img.src = jpgUrl || webpUrl;
        img.alt = `${data.title} 이미지 ${index + 1}`;
        img.loading = 'lazy';
        picture.appendChild(img);
        contentImgElement.appendChild(picture);
    });

    const contentElement = document.querySelector('.content');
    contentElement.textContent = data.content;

    const likeButtonElement = document.querySelector('.likeButton');
    const likeCountElement = likeButtonElement.querySelector('h3');
    let isLiked = Boolean(likeData.isLiked);
    let isLikeLoading = false;

    likeCountElement.textContent = formatCount(likeData.likeCount);
    setLikeButtonState(likeButtonElement, isLiked);

    likeButtonElement.addEventListener('click', async () => {
        if (isLikeLoading) return;
        isLikeLoading = true;

        try {
            if (!isLiked) {
                const { ok, status, code, data: likeData } = await likePost(
                    data.postId,
                );
                if (ok) {
                    isLiked = true;
                    setLikeButtonState(likeButtonElement, isLiked);
                    if (likeData && likeData.likeCount !== undefined) {
                        likeCountElement.textContent = formatCount(
                            likeData.likeCount,
                        );
                    }
                } else if (status === 409 && code === 'ALREADY_LIKED') {
                    isLiked = true;
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (status === HTTP_NOT_AUTHORIZED) {
                    window.location.href = '/html/login.html';
                } else {
                    Dialog('좋아요 실패', '좋아요 처리에 실패하였습니다.');
                }
            } else {
                const { ok, status, code, data: likeData } = await unlikePost(
                    data.postId,
                );
                if (ok) {
                    isLiked = false;
                    setLikeButtonState(likeButtonElement, isLiked);
                    if (likeData && likeData.likeCount !== undefined) {
                        likeCountElement.textContent = formatCount(
                            likeData.likeCount,
                        );
                    }
                } else if (status === 404 && code === 'LIKE_NOT_FOUND') {
                    isLiked = false;
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (status === HTTP_NOT_AUTHORIZED) {
                    window.location.href = '/html/login.html';
                } else {
                    Dialog('좋아요 취소 실패', '좋아요 취소에 실패하였습니다.');
                }
            }
        } finally {
            isLikeLoading = false;
        }
    });

    const viewCountElement = document.querySelector('.viewCount h3');
    viewCountElement.textContent = formatCount(data.views);

    const commentCountElement = document.querySelector('.commentCount h3');
    commentCountElement.textContent = (data.commentCount ?? 0).toLocaleString();
};

const setBoardModify = async data => {
    const modifyElement = document.querySelector('.hidden');
    modifyElement.classList.remove('hidden');

    const modifyBtnElement = document.querySelector('#deleteBtn');
    const postId = getQueryString('id');
    modifyBtnElement.addEventListener('click', () => {
        Dialog(
            '게시글을 삭제하시겠습니까?',
            '삭제한 내용은 복구 할 수 없습니다.',
            async () => {
                const { ok } = await deletePost(postId);
                if (ok) {
                    window.location.href = '/';
                } else {
                    Dialog('삭제 실패', '게시글 삭제에 실패하였습니다.');
                }
            },
        );
    });

    const modifyBtnElement2 = document.querySelector('#modifyBtn');
    modifyBtnElement2.addEventListener('click', () => {
        window.location.href = `/html/board-modify.html?postId=${data.postId}`;
    });
};

const getBoardComment = async postId => {
    const { ok, data } = await getComments(postId);
    if (!ok || !Array.isArray(data)) {
        throw new Error('댓글 정보를 가져오는데 실패하였습니다.');
    }
    return data;
};

const setBoardComment = (
    data,
    myInfo,
    postId,
    loginUserProfileImage,
) => {
    const commentListElement = document.querySelector('.commentList');
    if (commentListElement) {
        data.forEach(event => {
            const item = CommentItem(
                event,
                myInfo.userId,
                postId,
                loginUserProfileImage,
            );
            commentListElement.appendChild(item);
        });
    }

    //조회한 댓글 목록의 개수 표시
    const commentCountElement = document.querySelector('.commentCount h3');
    commentCountElement.textContent = data.length.toLocaleString();
};

const addComment = async () => {
    const comment = document.querySelector('textarea').value.trim();
    const pageId = getQueryString('id');

    if (!comment) {
        Dialog('댓글 등록 실패', '댓글은 1자 이상 입력해주세요.');
        return;
    }

    const { ok } = await writeComment(pageId, comment);

    if (ok) {
        window.location.reload();
    } else {
        Dialog('댓글 등록 실패', '댓글 등록에 실패하였습니다.');
    }
};

const inputComment = async () => {
    const textareaElement = document.querySelector(
        '.commentInputWrap textarea',
    );
    const commentBtnElement = document.querySelector('.commentInputBtn');

    if (textareaElement.value.length > MAX_COMMENT_LENGTH) {
        textareaElement.value = textareaElement.value.substring(
            0,
            MAX_COMMENT_LENGTH,
        );
    }
    if (textareaElement.value.trim() === '') {
        commentBtnElement.disabled = true;
        commentBtnElement.style.backgroundColor = '#ACA0EB';
    } else {
        commentBtnElement.disabled = false;
        commentBtnElement.style.backgroundColor = '#7F6AEE';
    }
};

const init = async () => {
    try {
        const data = await authCheck();
        const myInfoResult = await data.json();
        if (data.status !== HTTP_OK) {
            throw new Error('사용자 정보를 불러오는데 실패하였습니다.');
        }

        const myInfo = myInfoResult.data;
        const commentBtnElement = document.querySelector('.commentInputBtn');
        const textareaElement = document.querySelector(
            '.commentInputWrap textarea',
        );
        textareaElement.addEventListener('input', inputComment);
        commentBtnElement.addEventListener('click', addComment);
        commentBtnElement.disabled = true;
        console.log(myInfo);
        if (data.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
        }
        //헤더에서 사용할 로그인 유저의 프로필 썸네일 조회
        const profileImageResult = await getProfileImage(myInfo.userId);
        const profileImage =
            profileImageResult.ok && profileImageResult.data.thumbnailUrl
                ? profileImageResult.data.thumbnailUrl
                : DEFAULT_PROFILE_IMAGE;

        prependChild(document.body, Header('커뮤니티', 2, profileImage));

        const pageId = getQueryString('id');

        //게시글 상세 정보, 이미지 목록, 좋아요 정보 조회
        const [pageData, postImages, likeData] = await Promise.all([
            getBoardDetail(pageId),
            getBoardImages(pageId),
            getBoardLikes(pageId),
        ]);

        const isMyPost =
            parseInt(pageData.userId, 10) === parseInt(myInfo.userId, 10);
        if (isMyPost) {
            setBoardModify(pageData);
        }
        setBoardDetail(
            pageData,
            postImages,
            likeData,
            getProfileImageFileUrl(pageData.userId) || pageData.profileImageUrl,
        );

        //게시글에 작성된 댓글 목록 조회
        const comments = await getBoardComment(pageId);
        setBoardComment(comments, myInfo, pageId, profileImage);
    } catch (error) {
        console.error(error);
    }
};

init();
