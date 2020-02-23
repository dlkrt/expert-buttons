// ==UserScript==
// @name         ExpertsButtons
// @namespace    http://tampermonkey.net/
// @version      0.9
// @license MIT
// @author       dlkrt
// @match        https://vk.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function ExpertButtons() { // конструктор
    this.access_token = '..............'; // токен, полученный из официального приложения ВК

    function insertStyles() { // иниацилизация стилей
        var style = document.createElement("style");
        style.innerHTML = `
.arrow-container { /* для дива со стрелочками и счетчиком */
    display: flex;
    flex: 0.3;
    justify-content: space-between;
    align-items: center;
    margin-left: auto;
    padding-right: 10px;
}
.arrow {
    border-right: 10px solid transparent;
    border-left: 10px solid transparent;
    border-bottom: 10px solid #D6D8DB;
    position: relative;
}
.arrow-counter { /* счетчик голосов */
    line-height: 14px;
    color: #909399;
    font-weight: bold;
}

.arrow::before{
content: '';
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 10px solid #fff;
    position: absolute;
    top: 60%;
    margin-top: 3px;
    margin-left: -10px;
}
.arrow-up { /* стрелка вверх */
}
.arrow-down { /* вниз */
    transform:rotate(180deg);
}
.arrow-up:hover {
    border-bottom: 10px solid #3390FF;
    transition: 0.5s;
}
.arrow-down:hover {
border-bottom: 10px solid #3390FF;
transition: 0.5s;
}
.arrow[selected] {
border-bottom: 10px solid #3390FF;
}
`;
        document.head.appendChild(style);
    }

    function searchPosts(el) { // ищем посты
        var postsArray = el.querySelectorAll('.post,.wl_post'); // .wl_post для модальных постов
        if (!postsArray) return;
        Array.from(postsArray).map(function (post) {
            if (post.checked) return; // .checked для проверенных постов
            checkPost(post);  // отправляем на проверку наличия рейтинга
            post.checked = 1; // отмечаем пост проверенным
        });
    }


    function makeVote(e) { // голосуем... отправляем апи голос пользователя
        var voteValue = 0; // что выбрал пользователь
        if (e.currentTarget.classList.contains('arrow-up')) voteValue = 1;
        if (e.currentTarget.classList.contains('arrow-down')) voteValue = -1;

        var request = new XMLHttpRequest(); // отправка инфы о голосе к апи. сервер возвращает response: 1 (хз когда 0)
        request.open("POST", "https://api.vk.com/method/newsfeed.setPostVote", true);
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.responseType = 'json';
        request.onreadystatechange = function () {
            if (request.readyState !== 4) return;
            if (request.status === 200) {
                if (request.response.response === 0) { // если апи все-таки вернул response: 0
                    alert('oh.. какая-то ошибка, не удалось поставить оценку');
                } else {
                    var counter = e.target.parentElement.querySelector('.arrow-counter'); // ищем счетчик
                    if (Number(counter.getAttribute('rated')) === voteValue) { // если голос ранее === голос сейчас. отменяем сделанный ранее выбор
                        e.target.removeAttribute('selected'); // selected - атрибут помеченной стрелки (была ранее выбрана). убираем
                        counter.innerText = Number(counter.innerText) - Number(counter.getAttribute('rated')); // из счетчика вычитаем то, что ранее выбрал юзер
                        counter.setAttribute('rated', "0"); // в rated храним выбор юзера. одно из [-1,0,1]
                    } else {
                        e.target.parentElement.querySelectorAll('.arrow').forEach(function (item) {
                            item.removeAttribute('selected') // удаляем атрибуты выбранных стрелок
                        });
                        counter.innerText = Number(counter.innerText) - Number(counter.getAttribute('rated')) + voteValue; // поправляем значение счетчика
                        e.target.setAttribute('selected', 'true'); // устанавливаем выбор стрелке
                        counter.setAttribute('rated', voteValue); // в rated храним выбор юзера. одно из [-1,0,1]
                    }
                }
            }
        };
        request.onerror = function () {
            console.log('error during request api')
        };
        var post_link = e.target.getAttribute('data-post'); // в data-post храним значение owner_postId
        request.send('v=5.118&https=1&new_vote=' + voteValue + '&post_id=' + post_link.split('_')[1] + '&owner_id=' + post_link.split('_')[0] + '&lang=ru&access_token=' + this.access_token);
    }

    function draw(link, info) { // рисуем стрелочки и счетчик
        var container = document.createElement('div'); // контейнер с стрелочками и счетчиком
        container.classList.add('arrow-container');
        var arrowUp = document.createElement("a"); // стрелка вверх. можно для семантики сделать button
        var arrowDown = document.createElement("a"); // стрелка вниз
        var counter = document.createElement("div"); // счетчик голосов
        counter.classList.add('arrow-counter');
        counter.setAttribute('rated', info.rated); // заносим в атрибут голос пользователя. одно из [-1,0,1]
        counter.innerText = info.value; // число голосов за пост
        arrowUp.classList.add("arrow");
        arrowDown.classList.add("arrow");
        arrowUp.classList.add("arrow-up");
        var post_link = link.querySelector('.post_link').href.replace(/.+\//, "").replace('wall', ''); // post_link хранит ссылку на пост, убираем из нее мусор, оставляем ownerid_postid
        arrowDown.setAttribute('data-post', post_link);
        arrowUp.setAttribute('data-post', post_link);
        arrowDown.classList.add("arrow-down");
        if (info.rated) { // если юзер голосовол ранее, назначаем одной из стрелок атрибут selected
            if (info.rated === -1) arrowDown.setAttribute('selected', 'true');
            else arrowUp.setAttribute('selected', 'true');
        }

        arrowUp.addEventListener('mousedown', makeVote.bind(this)); // вешаем эвент нажатия стрелки вверх
        arrowDown.addEventListener('mousedown', makeVote.bind(this)); // стрелки вниз

        container.appendChild(arrowUp);
        container.appendChild(counter);
        container.appendChild(arrowDown);
        link.querySelector('.like_views').before(container); // вставляем перед счетчиком просмотров
        return info;
    }

    function checkPost(link) { // чекаем один пост, есть ли у него стрелки, получаем инфу о рейтинге из апи
        var post_link = link.querySelector('.post_link').href.replace(/.+\//, "").replace('wall', ''); // извлекаем из .post_link ссылку на пост, убираем мусор, осталяем ownerid_postid
        var request = new XMLHttpRequest(); // готовим запрос на получение инфы о посте от апи
        request.open("POST", "https://api.vk.com/method/wall.getById", true);
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.onreadystatechange = function () {
            if (request.readyState !== 4) return;
            if (request.status === 200) {
                var postInfo = request.response.response.items[0];
                if (!postInfo.rating) return; // если у поста рейтинга нет, скипаем
                draw(link, postInfo.rating); // рисуем стрелки и счетчик для поста
                return postInfo.rating;
            }
        };
        request.responseType = 'json';
        request.onerror = function () {
            console.log('error during request api')
        };
        request.send('v=5.118&https=1&lang=ru&posts=' + post_link + '&extended=1&access_token=' + this.access_token);
    }

    // создаем обработчик мутаций элемента
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) { // перебираем обновленя в элементах
            if (mutation.target.nodeType !== 1) return; // если элемент не блок, то выходим
            searchPosts(mutation.target); // отдаем элемент на проверку ссылок
        });
    });

    window.addEventListener("load", function () { // обработчик на загрузку страницы
        insertStyles(); // вставляем стили
        searchPosts(document.body); // отправляем body на проверку наличия постов

        observer.observe(document.body, { // запускаем обработчик мутаций
            childList: true,
            subtree: true
        });
    });
}

var script = document.createElement('script');
script.appendChild(document.createTextNode('(' + ExpertButtons + ')();'));
(document.body || document.head || document.documentElement).appendChild(script);