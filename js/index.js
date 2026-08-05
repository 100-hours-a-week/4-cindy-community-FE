import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getProfileImageFileUrl,
    prependChild,
} from '../utils/function.js';
import { getPosts, searchPosts } from '../api/indexRequest.js';
import { getProfileImage } from '../api/profileImageRequest.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_NOT_AUTHORIZED = 401;
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'recent';
let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let offset = 0;
let isEnd = false;
let isProcessing = false;

const updateSortVisibility = () => {
    const sortRow = document.querySelector('#searchSortRow');
    if (!sortRow) return;
    const isSearching = currentKeyword.trim().length > 0;
    sortRow.classList.toggle('isHidden', !isSearching);
    sortRow.setAttribute('aria-hidden', String(!isSearching));
};

// getBoardItem 함수
const getBoardItem = async (offsetValue = 0, limitValue = 5) => {
    const result =
        currentKeyword.trim() === ''
            ? await getPosts(offsetValue, limitValue)
            : await searchPosts(
                  currentKeyword,
                  offsetValue,
                  limitValue,
                  currentSort,
              );
    if (!result.ok) {
        throw new Error('Failed to load post list.');
    }
    return result.data;
};

const setBoardItem = boardData => {
    const boardList = document.querySelector('.boardList');
    if (boardList && boardData) {
        boardData.forEach(data => {
            const boardItem = BoardItem(
                data.postId,
                data.updatedAt,
                data.title,
                data.views,
                data.nickname,
                getProfileImageFileUrl(data.userId) || data.profileImageUrl,
                data.commentCount ?? 0,
                data.likeCount ?? 0,
            );
            if (boardItem) {
                boardList.appendChild(boardItem);
            }
        });
    }
};

const resetBoardList = () => {
    const boardList = document.querySelector('.boardList');
    if (boardList) {
        boardList.replaceChildren();
    }
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;

    try {
        if (reset) {
            offset = 0;
            isEnd = false;
            resetBoardList();
        }
        const postList = await getBoardItem(offset, ITEMS_PER_LOAD);
        const items = postList && Array.isArray(postList.content)
            ? postList.content
            : [];
        if (!items || items.length === 0) {
            isEnd = true;
            return;
        }
        setBoardItem(items);
        isEnd =
            postList.hasNext === false ||
            postList.last === true ||
            items.length < ITEMS_PER_LOAD;
        offset += 1;
    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
    } finally {
        isProcessing = false;
    }
};

const addSearchEvent = () => {
    const searchInput = document.querySelector('#searchInput');
    const searchButton = document.querySelector('.searchButton');
    if (!searchInput || !searchButton) return;

    const runSearch = async () => {
        const trimmedKeyword = searchInput.value.trim();
        if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
            Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
            return;
        }
        currentKeyword = trimmedKeyword;
        updateSortVisibility();
        await loadBoardItems({ reset: true });
    };

    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
};

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');
    if (!sortSelect) return;
    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        currentSort = sortSelect.value || DEFAULT_SORT;
        if (currentKeyword.trim().length === 0) return;
        await loadBoardItems({ reset: true });
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    window.addEventListener('scroll', async () => {
        const hasScrolledToThreshold =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight * SCROLL_THRESHOLD;
        if (hasScrolledToThreshold) {
            loadBoardItems();
        }
    });
};

const init = async () => {
    try {
        const response = await authCheck();
        if (!response) return;

        const data = await response.json();
        if (response.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
            return;
        }
        //로그인한 유저의 프로필 이미지 정보 조회
        const profileImageResult = await getProfileImage(data.data.userId);

        //프로필 이미지가 있으면 백엔드에서 받은 썸네일 URL 사용
        const profileImageUrl =
            profileImageResult.ok && profileImageResult.data.thumbnailUrl
                ? profileImageResult.data.thumbnailUrl
                : DEFAULT_PROFILE_IMAGE;

        prependChild(
            document.body,
            Header('Community', 0, profileImageUrl),
        );

        updateSortVisibility();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addSortEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();
