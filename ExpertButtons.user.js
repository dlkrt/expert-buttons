// ==UserScript==
// @name         ExpertsButtons
// @namespace    http://tampermonkey.net/
// @version      1.1
// @license      MIT
// @author       dlkrt, danyadev
// @match        https://vk.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function ExpertButtons() {
    // Сюда вставьте токен из приложения VK для Android
    const access_token = 'vk1.a.TEyVTqJIOE9mrfdWL85BEgZpyB-ndw2lpUIQWx2X3ZvYTIC5F3GCm7IzO8DVo_kf6NAJtLPMeqHLkj_G2qwkpU0lgSnL5Qh6qXXeLFmvbsrxSbQzV5J_nQwXKTrPHqKsYyOxHhqym3IsujYdzQFFI7GYW4pJIcIA2vIFrfeVH7mGcyrUOCK1cuYUxIKv9K4h';

    function vkapi(method, params = {}) {
        return new Promise((resolve, reject) => {
            const paramsList = [`access_token=${access_token}`, 'v=5.118', 'lang=ru'];

            for(const key in params) {
                paramsList.push(`${key}=${encodeURIComponent(params[key])}`);
            }

            const req = new XMLHttpRequest();

            req.open('POST', `https://api.vk.com/method/${method}`, true);
            req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            req.responseType = 'json';
            req.send(paramsList.join('&'));
            req.onerror = reject;
            req.onreadystatechange = function() {
                if(req.readyState !== 4) return;

                if(req.status === 200) {
                    resolve(req.response);
                }
            }
        });
    }

    function insertStyles() {
        const style = document.createElement('style');

        style.innerHTML = `
      .arrow-container { /* для дива со стрелочками и счетчиком */
        display: flex;
        flex: 0.2;
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
        padding: 10px;
      }

      .arrow::before {
        content: '';
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 10px solid #fff;
        position: absolute;
        top: 60%;
        margin-top: 3px;
        margin-left: -10px;
      }

      .arrow-up {} /* стрелка вверх */

      .arrow-down { /* стрелка вниз */
        transform: rotate(180deg);
      }
      .arrow-up:hover {
        border-bottom: 10px solid #3390FF;
        transition: .5s;
      }

      .arrow-down:hover {
        border-bottom: 10px solid #3390FF;
        transition: .5s;
      }

      .arrow[selected] {
        border-bottom: 10px solid #3390FF;
      }
    `;

        document.head.appendChild(style);
    }

    function searchPosts(el) {
        // .post - пост в ленте, .wl_post - пост в модальном окне
        // Оба типа постов имеют атрибут data-post-id
        const postsArray = el.querySelectorAll('.post, .wl_post');
        if(!postsArray) return;

        postsArray.forEach((post) => {
            if(post.checked) return;
            else post.checked = true;

            checkPost(post);
        });
    }

    async function checkPost(post) {
        const { response: { items: [postInfo] } } = await vkapi('wall.getById', {
            posts: post.dataset.postId,
            extended: 1
        });

        if(postInfo.rating) {
            renderButtons(post, postInfo.rating);
        }
    }

    function renderButtons(post, rating) {
        const post_id = post.dataset.postId;

        const arrowUp = document.createElement('a');
        arrowUp.classList.add('arrow');
        arrowUp.classList.add('arrow-up');
        arrowUp.setAttribute('data-post', post_id);
        arrowUp.addEventListener('mousedown', makeVote);

        const arrowDown = document.createElement('a');
        arrowDown.classList.add('arrow');
        arrowDown.classList.add('arrow-down');
        arrowDown.setAttribute('data-post', post_id);
        arrowDown.addEventListener('mousedown', makeVote);

        const counter = document.createElement('div');
        counter.classList.add('arrow-counter');
        counter.setAttribute('rated', rating.rated);
        counter.innerText = rating.value || '';

        if(rating.rated == 1) arrowUp.setAttribute('selected', true);
        if(rating.rated == -1) arrowDown.setAttribute('selected', true);

        const container = document.createElement('div');
        container.classList.add('arrow-container');
        container.appendChild(arrowUp);
        container.appendChild(counter);
        container.appendChild(arrowDown);

        post.querySelector('.like_views').before(container);
    }

    async function makeVote({ target }) {
        const [owner_id, post_id] = target.getAttribute('data-post').split('_');
        let new_vote = 0;

        if(target.classList.contains('arrow-up')) new_vote = 1;
        if(target.classList.contains('arrow-down')) new_vote = -1;

        const counter = target.parentElement.querySelector('.arrow-counter');

        let response = await vkapi('newsfeed.setPostVote', {
            owner_id,
            post_id,
            new_vote: (counter.getAttribute('rated') == new_vote) ? 0 : new_vote
        });
        if (!!response.error) {
            alert(response.error.error_code === 4000 ? 'Изменить голос уже нельзя' : 'Произошла неизвестная ошибка, голос не засчитан: '+JSON.stringify(response));
            return;
        }

        if(counter.getAttribute('rated') == new_vote) {
            target.removeAttribute('selected');
            counter.innerText = counter.innerText && (counter.innerText - counter.getAttribute('rated'));
            counter.setAttribute('rated', 0);
        } else {
            // Если до клика одна кнопка была активна, то new_vote != 0
            if(new_vote) {
                target.parentElement.querySelector(
                  new_vote == 1 ? '.arrow-down' : '.arrow-up'
                ).removeAttribute('selected');
            }

            counter.innerText = counter.innerText && (counter.innerText - counter.getAttribute('rated') + new_vote);
            target.setAttribute('selected', true);
            counter.setAttribute('rated', new_vote);
        }
    }

    window.addEventListener('load', () => {
        insertStyles();
        searchPosts(document.body);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if(mutation.target.nodeType == 1) {
                    searchPosts(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

const script = document.createElement('script');
const code = document.createTextNode(`(${ExpertButtons})();`);

script.appendChild(code);
document.head.appendChild(script);
