import { logout } from '../../api/authRequest.js';

const headerDropdownMenu = () => {
    const wrap = document.createElement('div');

    const modifyInfoLink = document.createElement('a');
    const modifyPasswordLink = document.createElement('a');
    const logoutLink = document.createElement('a');

    modifyInfoLink.textContent = '회원정보수정';
    modifyPasswordLink.textContent = '비밀번호수정';
    logoutLink.textContent = '로그아웃';

    modifyInfoLink.href = '/html/modifyInfo.html';
    modifyPasswordLink.href = '/html/modifyPassword.html';
    logoutLink.addEventListener('click', async event => {
        event.preventDefault();

        const { ok } = await logout();
        if (!ok) {
            return;
        }

        localStorage.clear();
        location.href = '/html/login.html';
    });

    wrap.classList.add('drop');

    wrap.appendChild(modifyInfoLink);
    wrap.appendChild(modifyPasswordLink);
    wrap.appendChild(logoutLink);

    return wrap;
};

// title : 헤더 타이틀
// leftBtn: 헤더 좌측 기능. 0 : None , 1: back , 2 : index
// rightBtn : 헤더 우측 기능. image 주소값 들어옴
const Header = (
    title,
    leftBtn = 0,
    profileImage = null,
) => {
    let leftBtnElement;
    let rightBtnElement;
    let headerElement;
    let h1Element;

    if (leftBtn == 1 || leftBtn == 2) {
        leftBtnElement = document.createElement('img');
        leftBtnElement.classList.add('back');
        leftBtnElement.src = '/public/navigate_before.svg';
        if (leftBtn == 1) {
            leftBtnElement.addEventListener('click', () => history.back());
        } else {
            leftBtnElement.addEventListener(
                'click',
                () => (location.href = '/'),
            );
        }
    }

    if (profileImage) {
        rightBtnElement = document.createElement('div');
        rightBtnElement.classList.add('profile');

        const profileElement = document.createElement('img');
        profileElement.classList.add('profile');
        profileElement.loading = 'eager';
        profileElement.src = profileImage;

        //프로필 이미지 조회 실패 시 기본 이미지로 대체
        profileElement.addEventListener(
            'error',
            () => {
                profileElement.src = '/public/profile_default.svg';
            },
            { once: true },
        );

        const Drop = headerDropdownMenu();
        Drop.classList.add('none');

        profileElement.addEventListener('click', event => {
            Drop.classList.toggle('none');
            event.stopPropagation();
        });

        rightBtnElement.appendChild(profileElement);
        rightBtnElement.appendChild(Drop);
    }

    h1Element = document.createElement('h1');
    h1Element.textContent = title;

    headerElement = document.createElement('header');

    if (leftBtnElement) headerElement.appendChild(leftBtnElement);
    headerElement.appendChild(h1Element);
    if (rightBtnElement) headerElement.appendChild(rightBtnElement);

    return headerElement;
};

window.addEventListener('click', e => {
    const dropMenu = document.querySelector('.drop');
    if (dropMenu && !dropMenu.classList.contains('none')) {
        dropMenu.classList.add('none');
    }
});

export default Header;
