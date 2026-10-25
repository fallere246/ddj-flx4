/*
 * DJ 入門コースの共通処理。
 * ページ本文は <article class="lesson"> だけを書き、ヘッダー・コース一覧・目次・前後リンクはここで差し込む。
 */
(() => {
    const root = document.body.dataset.root || '';
    const pageId = document.body.dataset.page || '';

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* 保存できなくても動作は続ける */ } },
    };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ========== レッスンの並び ==========
    const lessons = COURSE.flatMap((part, pi) => part.lessons.map(l => ({ ...l, part, partNo: pi + 1 })));
    lessons.forEach((l, i) => { l.no = i + 1; });
    const lessonUrl = id => `${root}learn/${id}.html`;
    const current = lessons.find(l => l.id === pageId);

    // ========== 完了したレッスン ==========
    const DONE_KEY = 'flx4-learn-done';
    const doneSet = () => {
        try { return new Set(JSON.parse(store.get(DONE_KEY)) || []); } catch (e) { return new Set(); }
    };
    const setDone = (id, on) => {
        const set = doneSet();
        if (on) set.add(id); else set.delete(id);
        store.set(DONE_KEY, JSON.stringify([...set]));
    };

    // ========== ソフトウェア（本体マニュアルと共通） ==========
    const SW_KEY = 'ddj-flx4-sw';
    const SW = {
        mac: { name: 'rekordbox', sub: 'Mac/Windows', tags: ['mac', 'rb'] },
        ios: { name: 'rekordbox', sub: 'iOS/Android', tags: ['ios', 'rb'] },
        serato: { name: 'Serato DJ Lite', sub: 'Mac/Windows', tags: ['serato'] },
    };
    let sw = SW[store.get(SW_KEY)] ? store.get(SW_KEY) : 'mac';

    const applySw = () => {
        document.querySelectorAll('[data-sw]').forEach(el => {
            el.hidden = !el.dataset.sw.split(/\s+/).some(t => SW[sw].tags.includes(t));
        });
        document.querySelectorAll('.sw-picker button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === sw)));
        document.querySelectorAll('.sw-name').forEach(el => { el.textContent = SW[sw].name; });
    };

    const swPickerHtml = () => `<div class="sw-picker" role="group" aria-label="使うソフトウェア">${
        Object.entries(SW).map(([k, v]) => `<button type="button" data-value="${k}" aria-pressed="false">${v.name === 'Serato DJ Lite' ? 'Serato' : v.name}<small>${v.name === 'Serato DJ Lite' ? 'DJ Lite' : v.sub}</small></button>`).join('')
    }</div>`;

    // ========== ヘッダー ==========
    const header = document.createElement('header');
    header.className = 'site-header';
    const navItems = [
        ['course', `${root}index.html#course`, 'コース'],
        ['manual', `${root}manual/index.html`, '本体マニュアル'],
        ['glossary', `${root}learn/glossary.html`, '用語集'],
        ['trouble', `${root}learn/trouble.html`, '困ったとき'],
    ];
    const navCurrent = current ? 'course' : pageId;
    header.innerHTML = `
        <a class="site-logo" href="${root}index.html"><b>FLX4</b>DJ 入門</a>
        <button class="menu-btn" type="button" aria-expanded="false">メニュー</button>
        <nav class="site-nav" aria-label="サイト">${navItems.map(([id, href, label]) =>
            `<a href="${href}"${id === navCurrent ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
    document.body.prepend(header);
    const menuBtn = header.querySelector('.menu-btn');
    menuBtn.addEventListener('click', () => {
        const open = header.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
    });

    // ========== 本体のボタン名 → マニュアルへのリンク ==========
    document.querySelectorAll('a.ctl[data-ctl]').forEach(a => {
        const { ctl, deck = '', ch = '' } = a.dataset;
        a.href = `${root}manual/index.html#${ctl}/${deck}/${ch}`;
        if (!a.title) a.title = 'Web マニュアルでこの部分を見る';
    });

    // ========== 用語のツールチップ ==========
    const glossary = typeof GLOSSARY === 'undefined' ? {} : GLOSSARY;
    const tip = document.createElement('div');
    tip.className = 'term-tip';
    tip.hidden = true;
    document.body.append(tip);
    document.querySelectorAll('a.term').forEach(a => {
        const id = a.dataset.term;
        const g = glossary[id];
        if (!g) { console.warn('用語集にない用語:', id); return; }
        a.href = `${root}learn/glossary.html#${id}`;
        const show = () => {
            tip.innerHTML = `<b>${esc(g.term)}</b>${esc(g.short || g.desc)}`;
            tip.hidden = false;
            const r = a.getBoundingClientRect();
            const w = Math.min(300, window.innerWidth - 24);
            tip.style.maxWidth = `${w}px`;
            const left = Math.max(12, Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - w - 12));
            tip.style.left = `${left}px`;
            tip.style.top = `${r.bottom + window.scrollY + 8}px`;
        };
        a.addEventListener('mouseenter', show);
        a.addEventListener('focus', show);
        a.addEventListener('mouseleave', () => { tip.hidden = true; });
        a.addEventListener('blur', () => { tip.hidden = true; });
    });

    // ========== 確認クイズ ==========
    // <div class="quiz"><p class="quiz-q">問題</p><ul><li data-correct>正解</li><li>不正解</li></ul><p class="quiz-explain">解説</p></div>
    document.querySelectorAll('.quiz').forEach((quiz, qi) => {
        const items = [...quiz.querySelectorAll('li')];
        const explain = quiz.querySelector('.quiz-explain');
        const options = document.createElement('div');
        options.className = 'quiz-options';
        items.forEach(li => {
            const b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = li.innerHTML;
            if (li.hasAttribute('data-correct')) b.dataset.correct = '';
            options.append(b);
        });
        quiz.querySelector('ul').replaceWith(options);
        quiz.insertAdjacentHTML('afterbegin', `<p class="quiz-label">確認クイズ ${qi + 1}</p>`);
        if (explain) explain.hidden = true;
        options.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            const right = b.hasAttribute('data-correct');
            options.querySelectorAll('button').forEach(x => {
                x.disabled = true;
                if (x.hasAttribute('data-correct')) x.classList.add('right');
            });
            if (!right) b.classList.add('wrong');
            if (explain) {
                explain.hidden = false;
                explain.classList.toggle('wrong', !right);
                explain.insertAdjacentHTML('afterbegin', `<b>${right ? '正解！' : '惜しい。'}</b> `);
            }
        });
    });

    // ========== 表は横にスクロールできるようにする ==========
    document.querySelectorAll('.lesson table').forEach(t => {
        if (t.parentElement.classList.contains('table-wrap')) return;
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        t.replaceWith(wrap);
        wrap.append(t);
    });

    // ========== レッスンページ ==========
    const article = document.querySelector('article.lesson');
    if (article && current) {
        const layout = document.createElement('main');
        layout.className = 'lesson-layout';
        article.replaceWith(layout);

        // 左：コース一覧
        const done = doneSet();
        const nav = document.createElement('nav');
        nav.className = 'course-nav';
        nav.setAttribute('aria-label', 'コースのレッスン');
        nav.innerHTML = COURSE.map((part, pi) => `
            <h2>第${pi + 1}部　${esc(part.title)}</h2>
            <ol>${part.lessons.map(l => {
                const info = lessons.find(x => x.id === l.id);
                return `<li class="${done.has(l.id) ? 'done' : ''}"><a href="${lessonUrl(l.id)}"${l.id === pageId ? ' aria-current="page"' : ''}><span class="num"><span>${info.no}</span></span>${esc(l.title)}</a></li>`;
            }).join('')}</ol>`).join('');

        // 見出しの上：部の名前と所要時間
        const h1 = article.querySelector('h1');
        const head = document.createElement('header');
        head.className = 'lesson-head';
        const hasSw = article.querySelector('[data-sw]');
        head.innerHTML = `<p class="lesson-part">第${current.partNo}部 ${esc(current.part.title)} ・ レッスン ${current.no}</p>`;
        h1.replaceWith(head);
        head.append(h1);
        head.insertAdjacentHTML('beforeend', `<div class="lesson-meta"><span>目安 ${current.min} 分</span>${
            hasSw ? `<span>使うソフト：</span>${swPickerHtml()}` : ''}</div>`);
        // スマホではサイドのコース一覧が出ないので、見出しの下に折りたたんで置く
        const mobileNav = document.createElement('details');
        mobileNav.className = 'mobile-course';
        mobileNav.innerHTML = `<summary>コースのレッスン一覧（${current.no} / ${lessons.length}）</summary>${nav.innerHTML}`;
        head.append(mobileNav);
        const lead = article.querySelector('.lead');
        const goals = article.querySelector('.goals');
        if (lead) head.append(lead);
        if (goals) head.append(goals);

        // 見出しに id を振って、右の目次を作る
        const h2s = [...article.querySelectorAll(':scope > h2, :scope > section > h2')].filter(h => !h.closest('.summary, .goals'));
        h2s.forEach((h, i) => { if (!h.id) h.id = `s${i + 1}`; });
        const toc = document.createElement('nav');
        toc.className = 'toc';
        toc.setAttribute('aria-label', 'このページの目次');
        toc.innerHTML = `<h2>このページの内容</h2><ol>${h2s.map(h => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join('')}</ol>`;

        // 末尾：完了ボタンと前後のレッスン
        const idx = lessons.indexOf(current);
        const prev = lessons[idx - 1];
        const next = lessons[idx + 1];
        const end = document.createElement('footer');
        end.className = 'lesson-end';
        end.innerHTML = `
            <button class="done-btn" type="button" aria-pressed="false"></button>
            <div class="pager">
                ${prev ? `<a class="prev" href="${lessonUrl(prev.id)}"><small>← 前のレッスン</small>${esc(prev.title)}</a>` : ''}
                ${next ? `<a class="next" href="${lessonUrl(next.id)}"><small>次のレッスン →</small>${esc(next.title)}</a>`
                       : `<a class="next" href="${root}index.html#course"><small>コースのトップへ →</small>おつかれさまでした</a>`}
            </div>`;
        article.append(end);
        const doneBtn = end.querySelector('.done-btn');
        const paintDone = () => {
            const on = doneSet().has(pageId);
            doneBtn.setAttribute('aria-pressed', String(on));
            doneBtn.textContent = on ? '✓ このレッスンは完了しています' : 'このレッスンを完了にする';
            nav.querySelector('a[aria-current]')?.parentElement.classList.toggle('done', on);
        };
        doneBtn.addEventListener('click', () => { setDone(pageId, !doneSet().has(pageId)); paintDone(); });
        paintDone();

        layout.append(nav, article, toc);

        // 目次の現在位置
        if ('IntersectionObserver' in window && h2s.length) {
            const links = new Map(h2s.map(h => [h, toc.querySelector(`a[href="#${h.id}"]`)]));
            const visible = new Set();
            const io = new IntersectionObserver(entries => {
                entries.forEach(en => { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
                const first = h2s.find(h => visible.has(h));
                if (!first) return;
                links.forEach(a => a.classList.remove('active'));
                links.get(first).classList.add('active');
            }, { rootMargin: '-60px 0px -55% 0px' });
            h2s.forEach(h => io.observe(h));
        }
    } else if (article) {
        // 用語集など、コースに入らないページ
        const layout = document.createElement('main');
        layout.className = 'lesson-layout appendix';
        article.replaceWith(layout);
        layout.append(article);
        if (article.querySelector('[data-sw]')) {
            article.querySelector('h1').insertAdjacentHTML('afterend', `<div class="lesson-meta"><span>使うソフト：</span>${swPickerHtml()}</div>`);
        }
    }

    // ========== フッター ==========
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `このサイトは個人が作った非公式の学習サイトです。Pioneer DJ、AlphaTheta、rekordbox、Serato とは関係ありません。<br>
        本体の操作は DDJ-FLX4 取扱説明書（DRJ1092-A）、rekordbox の操作は rekordbox 7 操作説明書（ver. 7.0.0）をもとに要約しています。正確な仕様は公式の取扱説明書とソフトウェアのマニュアルを確認してください。`;
    document.body.append(footer);

    // ========== ソフトウェアの切り替え ==========
    document.addEventListener('click', e => {
        const b = e.target.closest('.sw-picker button');
        if (!b) return;
        sw = b.dataset.value;
        store.set(SW_KEY, sw);
        applySw();
    });
    applySw();

    // 共通処理をほかのスクリプトからも使えるようにする
    window.Site = { root, lessons, doneSet, store, esc, lessonUrl, get sw() { return sw; } };
})();
