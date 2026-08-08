import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getProfileImageFileUrl,
    padTo2Digits,
    prependChild,
} from '../utils/function.js';
import {
    getPosts,
    getTrendingPosts,
    searchPosts,
} from '../api/indexRequest.js';
import { getProfileImage } from '../api/profileImageRequest.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_NOT_AUTHORIZED = 401;
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 5;
const TRENDING_ITEMS_LIMIT = 10;
const TRENDING_PERIOD_DAYS = 7;
const DEFAULT_SORT = 'recent';
let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let offset = 0;
let isEnd = false;
let isProcessing = false;

const formatTrendingDateTime = date => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    return `${padTo2Digits(month)}.${padTo2Digits(day)} ${padTo2Digits(hours)}:${padTo2Digits(minutes)}`;
};

const getTrendingPeriodText = () => {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - TRENDING_PERIOD_DAYS);

    return `최근 ${TRENDING_PERIOD_DAYS}일 기준 · ${formatTrendingDateTime(startDate)} ~ ${formatTrendingDateTime(endDate)}`;
};

const setTrendingPeriodText = () => {
    const trendingPeriod = document.querySelector('#trendingPeriod');
    if (trendingPeriod) {
        trendingPeriod.textContent = getTrendingPeriodText();
    }
};

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

const appendBoardItems = (container, boardData) => {
    if (container && boardData) {
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
                container.appendChild(boardItem);
            }
        });
    }
};

const setBoardItem = boardData => {
    appendBoardItems(document.querySelector('.boardList'), boardData);
};

const hideTrendingSection = () => {
    const trendingSection = document.querySelector('.trendingSection');
    if (trendingSection) {
        trendingSection.classList.add('isHidden');
    }
};

const setTrendingItems = trendingData => {
    const trendingList = document.querySelector('.trendingList');
    if (!trendingList || !trendingData) return;

    trendingData.forEach((data, index) => {
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
        if (!boardItem) return;

        boardItem.classList.add('trendingCard');
        boardItem.setAttribute('aria-roledescription', 'slide');
        boardItem.setAttribute('aria-label', `${index + 1}위 인기글`);

        const badge = document.createElement('span');
        badge.className = 'trendingRankBadge';
        badge.textContent = `TOP ${index + 1}`;

        const boardItemBody = boardItem.querySelector('.boardItem');
        if (boardItemBody) {
            boardItemBody.prepend(badge);
        }

        trendingList.appendChild(boardItem);
    });
};

const updateTrendingControls = () => {
    const trendingList = document.querySelector('.trendingList');
    const prevButton = document.querySelector('#trendingPrevButton');
    const nextButton = document.querySelector('#trendingNextButton');
    if (!trendingList || !prevButton || !nextButton) return;

    const maxScrollLeft = trendingList.scrollWidth - trendingList.clientWidth;
    prevButton.disabled = trendingList.scrollLeft <= 0;
    nextButton.disabled = trendingList.scrollLeft >= maxScrollLeft - 1;
};

const addTrendingControlEvent = () => {
    const trendingList = document.querySelector('.trendingList');
    const prevButton = document.querySelector('#trendingPrevButton');
    const nextButton = document.querySelector('#trendingNextButton');
    if (!trendingList || !prevButton || !nextButton) return;

    const scrollByPage = direction => {
        trendingList.scrollBy({
            left: direction * trendingList.clientWidth,
            behavior: 'smooth',
        });
    };

    prevButton.addEventListener('click', () => scrollByPage(-1));
    nextButton.addEventListener('click', () => scrollByPage(1));
    trendingList.addEventListener('scroll', updateTrendingControls);
    window.addEventListener('resize', updateTrendingControls);
    updateTrendingControls();
};

const loadTrendingSection = async () => {
    try {
        const result = await getTrendingPosts(0, TRENDING_ITEMS_LIMIT);
        if (!result.ok) {
            throw new Error('Failed to load trending post list.');
        }

        const items = result.data && Array.isArray(result.data.content)
            ? result.data.content
            : [];
        if (!items || items.length === 0) {
            hideTrendingSection();
            return;
        }

        setTrendingItems(items);
        updateTrendingControls();
    } catch (error) {
        console.error('Error fetching trending items:', error);
        hideTrendingSection();
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
            Header('Dessert Log 🍰', 0, profileImageUrl),
        );

        updateSortVisibility();
        setTrendingPeriodText();
        addTrendingControlEvent();
        loadTrendingSection();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addSortEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();
