import {
    padTo2Digits,
    resolveImageUrl,
} from '../../utils/function.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';

const BoardItem = (
    postId,
    date,
    title,
    viewCount,
    writer,
    profileImage,
    commentCount = 0,
    likeCount = 0,
) => {
    // 파라미터 값이 없으면 리턴
    if (
        postId === undefined ||
        !date ||
        !title ||
        viewCount === undefined ||
        likeCount === undefined ||
        commentCount === undefined ||
        !writer
    ) {
        return null;
    }

    // 날짜 포맷 변경 YYYY-MM-DD hh:mm:ss
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const seconds = dateObj.getSeconds();

    const formattedDate = `${year}-${padTo2Digits(month)}-${padTo2Digits(day)} ${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
    const profileImageUrl = resolveImageUrl(
        profileImage,
        DEFAULT_PROFILE_IMAGE,
    );

    const link = document.createElement('a');
    link.href = `/html/board.html?id=${postId}`;

    const boardItem = document.createElement('div');
    boardItem.className = 'boardItem';

    const titleElement = document.createElement('h2');
    titleElement.className = 'title';
    titleElement.textContent = title;

    const info = document.createElement('div');
    info.className = 'info';

    const like = createCountElement('좋아요', likeCount);
    const comment = createCountElement('댓글', commentCount);
    const view = createCountElement('조회수', viewCount);

    const dateElement = document.createElement('p');
    dateElement.className = 'date';
    dateElement.textContent = formattedDate;

    info.appendChild(like);
    info.appendChild(comment);
    info.appendChild(view);
    info.appendChild(dateElement);

    const writerInfo = document.createElement('div');
    writerInfo.className = 'writerInfo';

    const picture = document.createElement('picture');
    picture.className = 'img';

    const img = document.createElement('img');
    img.src = profileImageUrl;
    img.alt = `${writer} 프로필 이미지`;
    // 이미지가 깨져도 문자열 이벤트 핸들러 없이 기본 프로필로만 갈아끼운다
    img.onerror = () => {
        img.onerror = null;
        img.src = DEFAULT_PROFILE_IMAGE;
    };

    const writerElement = document.createElement('h2');
    writerElement.className = 'writer';
    writerElement.textContent = writer;

    picture.appendChild(img);
    writerInfo.appendChild(picture);
    writerInfo.appendChild(writerElement);

    boardItem.appendChild(titleElement);
    boardItem.appendChild(info);
    boardItem.appendChild(writerInfo);
    link.appendChild(boardItem);

    return link;
};

const createCountElement = (label, count) => {
    const element = document.createElement('h3');
    element.className = 'views';
    element.append(`${label} `);

    const countElement = document.createElement('b');
    countElement.textContent = count;
    element.appendChild(countElement);

    return element;
};

export default BoardItem;
