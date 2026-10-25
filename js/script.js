document.addEventListener('DOMContentLoaded', function() {
    const controller = document.querySelector('.controller');
    const stage = document.querySelector('.stage');
    const stageBox = document.querySelector('.stage-box');
    const viewer = document.querySelector('.viewer');
    const shiftToggle = document.querySelector('.shift-toggle');
    const proToggle = document.querySelector('.pro-toggle');
    const proCheck = document.getElementById('show-pro');
    const search = document.querySelector('.search');
    const bodies = {
        detail: document.querySelector('[data-body="detail"]'),
        guide: document.querySelector('[data-body="guide"]'),
        index: document.querySelector('[data-body="index"]'),
    };
    const hotspots = [...document.querySelectorAll('[data-ctl]')];

    const state = {
        sw: 'mac',
        showPro: false,
        shiftLatched: false,
        shiftHeld: false,
        sel: null,          // { id, deck, ch, pad }
        modes: { 1: null, 2: null },
        tab: 'detail',
        guide: null,        // { id, step }
        query: '',
    };

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* 保存できなくても動作は続ける */ } },
    };

    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const family = () => SOFTWARE[state.sw].family;
    const shiftOn = () => state.shiftLatched || state.shiftHeld;

    // ========== 画面サイズに合わせて拡大縮小（?scale=1 で等倍固定） ==========
    const OVERHANG = 12; // 本体上辺からはみ出すジャックの分
    const fixedScale = parseFloat(new URLSearchParams(location.search).get('scale'));
    const fit = () => {
        const maxH = innerHeight - 140;
        const scale = fixedScale || Math.max(Math.min(viewer.clientWidth / 931, maxH / (516 + OVERHANG)), 0.2);
        stage.style.setProperty('--scale', scale);
        stage.style.marginTop = `${OVERHANG * scale}px`;
        stageBox.style.width = `${931 * scale}px`;
        stageBox.style.height = `${(516 + OVERHANG) * scale}px`;
    };
    fit();
    addEventListener('resize', fit);

    // ========== データの引き当て ==========
    const deckOf = el => {
        if (el.dataset.deck) return Number(el.dataset.deck);
        const deck = el.closest('.deck');
        return deck ? (deck.classList.contains('right') ? 2 : 1) : null;
    };

    // 今のソフトで有効な操作だけを返す
    const actionsOf = id => {
        const ctl = CONTROLS[id];
        const list = ctl.both || ctl[family()] || [];
        return list.filter(a => {
            if (a.only === 'mac' || a.only === 'ios') return state.sw === a.only;
            if (a.only === 'pro') return family() === 'se' && state.showPro;
            return true;
        });
    };

    const hasShift = id => actionsOf(id).some(a => a.shift);

    const modeTable = () => PAD_MODES[family()];

    const modeAvailable = key => {
        const mode = modeTable()[key];
        return mode && (!mode.pro || state.showPro);
    };

    // パッド 1〜8 の割り当てを [表示, 説明] で返す（SHIFT 層がない箇所は null）
    const padsOf = (key, deck, shift) => {
        const mode = modeTable()[key];
        if (!mode) return null;
        if (state.sw === 'ios' && mode.ios) {
            if (shift) return null;
            return mode.ios.map(l => [l, `初期プリセット「${l}」が割り当てられています（アプリ側で変更できます）。`]);
        }
        if (shift) {
            if (!mode.shiftPads || state.sw === 'ios') return null;
            return mode.shiftPads;
        }
        if (family() === 'se' && state.showPro && mode.proPads) return mode.proPads;
        if (deck === 2 && mode.deck2Pads) return mode.deck2Pads;
        return mode.pads;
    };

    // ========== 本体図の状態 ==========
    const paintController = () => {
        controller.classList.toggle('shift-on', shiftOn());
        shiftToggle.setAttribute('aria-pressed', String(shiftOn()));

        const guideStep = currentGuideStep();
        const guideIds = guideStep ? guideStep.ctl : [];
        const matches = state.query ? new Set(searchResults().map(r => r.id)) : null;

        hotspots.forEach(el => {
            const id = el.dataset.ctl;
            const s = state.sel;
            const selected = s && s.id === id
                && (!s.deck || deckOf(el) === s.deck || !deckOf(el))
                && (!s.ch || el.dataset.ch === String(s.ch))
                && (!s.pad || el.dataset.pad === String(s.pad));
            el.classList.toggle('is-sel', Boolean(selected));
            el.classList.toggle('is-guide', guideIds.includes(id));
            el.classList.toggle('is-match', Boolean(matches && matches.has(id)));
            el.classList.toggle('has-shift', hasShift(id));
        });

        // パッドモードボタンの点灯とパッドの表示
        [1, 2].forEach(deck => {
            const deckEl = controller.querySelector(deck === 1 ? '.deck.left' : '.deck.right');
            const key = state.modes[deck];
            deckEl.querySelectorAll('.pad-mode-btn').forEach(btn => {
                const acts = actionsOf(btn.dataset.ctl);
                const normal = acts.find(a => !a.shift && a.mode === key);
                const alt = acts.find(a => a.shift && a.mode === key);
                btn.classList.toggle('active', Boolean(key && (normal || alt)));
                btn.classList.toggle('alt', Boolean(key && alt));
            });
            const normal = key ? padsOf(key, deck, false) : null;
            const shifted = key && shiftOn() ? padsOf(key, deck, true) : null;
            deckEl.querySelectorAll('.pad').forEach(pad => {
                const i = Number(pad.dataset.pad) - 1;
                const entry = (shifted && shifted[i]) || (normal && normal[i]);
                const label = pad.querySelector('.pad-label');
                label.textContent = entry ? entry[0] : '';
                label.classList.toggle('long', Boolean(entry && entry[0].length > 6));
            });
        });
    };

    // ========== 説明タブ ==========
    const badge = a => {
        if (a.only === 'mac') return '<span class="badge mac">Mac/Windows</span>';
        if (a.only === 'ios') return '<span class="badge ios">iOS/Android</span>';
        if (a.only === 'pro') return '<span class="badge pro">Serato DJ Pro</span>';
        return '';
    };

    const actHtml = (a, deck) => {
        const other = a.deck && deck && a.deck !== deck;
        return `<div class="act${other ? ' is-other-deck' : ''}">
            <div class="act-how">${a.shift ? '<kbd>SHIFT</kbd> +' : ''} ${esc(a.how)} ${a.deck ? `<span class="badge side">デッキ ${a.deck}</span>` : ''}${badge(a)}</div>
            <div class="act-text">${esc(a.text)}</div>
            ${a.mode && modeAvailable(a.mode) ? `<div class="chip-row"><button class="chip" data-set-mode="${a.mode}" data-deck="${deck || 1}">${esc(modeTable()[a.mode].name)} のパッドを見る</button></div>` : ''}
        </div>`;
    };

    const introHtml = () => `<div class="intro">
        <h2>使いかた</h2>
        <ul>
            <li>左の本体図のボタンやつまみをクリックすると、ここに「押す」「回す」などの操作ごとの説明が出ます。</li>
            <li>上の <kbd>SHIFT</kbd> を押すか、キーボードの Shift キーを押している間は、SHIFT を押しながらの機能を確認できます。点線の枠がある部品に SHIFT 機能があります。</li>
            <li>パッドモードボタン（HOT CUE など）を押すと、パッドに割り当てが表示されます。パッドをクリックすると個別の説明が出ます。</li>
            <li>「操作ガイド」では、ループやホットキューなどの手順を、本体図を光らせながら順番に確認できます。</li>
        </ul>
        <p class="empty" style="margin-top: 12px">使うソフトは上のボタンで切り替えられます。</p>
    </div>`;

    const padDetailHtml = sel => {
        const deck = sel.deck || 1;
        const key = state.modes[deck];
        const ctl = CONTROLS.pad;
        let html = `<div class="d-name">パフォーマンスパッド ${sel.pad ? sel.pad : ''}</div>
            <div class="d-meta">デッキ部・デッキ ${deck} · 取扱説明書 p.${ctl.page[family()]}</div>`;
        const chips = Object.keys(modeTable()).filter(modeAvailable)
            .map(k => `<button class="chip${k === key ? ' is-on' : ''}" data-set-mode="${k}" data-deck="${deck}">${esc(modeTable()[k].name)}</button>`).join('');
        if (!key) {
            return html + `<div class="pad-pick">パッドの働きはパッドモードで変わります。モードを選ぶとパッドの割り当てが表示されます。</div>
                <div class="chip-row">${chips}</div>`;
        }
        const mode = modeTable()[key];
        const normal = padsOf(key, deck, false);
        const shiftPads = padsOf(key, deck, true);
        const grid = (pads, isShift) => `<div class="pad-grid">${pads.map((p, i) => {
            const entry = p || normal[i];
            const empty = isShift && !p;
            return `<button class="${sel.pad === i + 1 && isShift === shiftOn() ? 'is-sel' : ''}${empty ? ' is-empty' : ''}" data-pick-pad="${i + 1}" data-deck="${deck}" title="${esc(entry[1])}">${esc(empty ? '—' : entry[0])}</button>`;
        }).join('')}</div>`;
        const layer = shiftOn() && shiftPads ? shiftPads : normal;
        const picked = sel.pad ? (layer[sel.pad - 1] || normal[sel.pad - 1]) : null;
        html += `<div class="chip-row">${chips}</div>
            <div class="d-group"><div class="d-group-title">${esc(mode.name)} モード · p.${mode.page}</div>
            <div class="act"><div class="act-text">${esc(mode.desc)}</div></div></div>`;
        if (picked) {
            html += `<div class="d-group is-focus"><div class="d-group-title">パッド ${sel.pad}${shiftOn() && shiftPads && shiftPads[sel.pad - 1] ? '（SHIFT + 押す）' : ''}</div>
                <div class="act"><div class="act-how">${esc(picked[0])}</div><div class="act-text">${esc(picked[1])}</div></div></div>`;
        }
        html += `<div class="d-group${shiftOn() ? '' : ' is-focus'}"><div class="d-group-title">パッドの割り当て</div>${grid(normal, false)}</div>`;
        if (shiftPads) {
            html += `<div class="d-group${shiftOn() ? ' is-focus' : ''}"><div class="d-group-title"><kbd>SHIFT</kbd> + パッド</div>${grid(shiftPads, true)}</div>`;
        }
        const notes = [...mode.notes];
        if (state.sw === 'ios' && mode.iosNote) notes.unshift(mode.iosNote);
        if (state.sw === 'ios' && mode.ios) notes.unshift('割り当ては rekordbox アプリの画面に表示され、編集できます。');
        if (family() === 'se' && !state.showPro && mode.proPads) notes.push('Serato DJ Pro では 8 つのパッドすべてに割り当てが広がります（上の「Serato DJ Pro の機能も表示」で確認できます）。');
        if (notes.length) html += `<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
        return html;
    };

    const renderDetail = () => {
        const sel = state.sel;
        if (!sel) { bodies.detail.innerHTML = introHtml(); return; }
        if (sel.id === 'pad') { bodies.detail.innerHTML = padDetailHtml(sel); return; }
        const ctl = CONTROLS[sel.id];
        const acts = actionsOf(sel.id);
        const normal = acts.filter(a => !a.shift);
        const shifted = acts.filter(a => a.shift);
        const where = [SECTIONS[ctl.section], sel.deck && (ctl.section === 'deck' || sel.id === 'load') ? `デッキ ${sel.deck}` : '', sel.ch ? `CH ${sel.ch}` : '']
            .filter(Boolean).join('・');
        const group = (title, list, focus) => list.length
            ? `<div class="d-group${focus ? ' is-focus' : ''}"><div class="d-group-title">${title}</div>${list.map(a => actHtml(a, sel.deck)).join('')}</div>`
            : '';
        let html = `<div class="d-name">${esc(ctl.name)}</div>
            <div class="d-meta">${esc(where)} · 取扱説明書 p.${ctl.page[family()]}</div>`;
        if (!acts.length) {
            html += `<p class="empty" style="margin-top: 16px">${esc(SOFTWARE[state.sw].label)} では、この部品に割り当てられた機能はありません。${family() === 'se' ? '「Serato DJ Pro の機能も表示」をオンにすると Pro の機能を確認できます。' : ''}</p>`;
        } else if (shiftOn()) {
            html += group('<kbd>SHIFT</kbd> を押しながら', shifted, true) + group('そのまま操作', normal, false);
            if (!shifted.length) html += '<p class="empty" style="margin-top: 12px">この部品には SHIFT を押しながらの機能はありません。</p>';
        } else {
            html += group('操作', normal, true) + group('<kbd>SHIFT</kbd> を押しながら', shifted, false);
        }
        bodies.detail.innerHTML = html;
    };

    // ========== 操作ガイド ==========
    const guidesForSw = () => GUIDES.filter(g => !g.sw || g.sw === family());
    const stepsOf = g => g.steps.filter(st => !st.sw || st.sw === family());
    const currentGuideStep = () => {
        if (state.tab !== 'guide' || !state.guide) return null;
        const g = GUIDES.find(x => x.id === state.guide.id);
        return g ? stepsOf(g)[state.guide.step] : null;
    };

    const renderGuide = () => {
        if (!state.guide) {
            bodies.guide.innerHTML = `<ul class="guide-list">${guidesForSw().map(g =>
                `<li><button data-guide="${g.id}">${esc(g.title)}<small>${stepsOf(g).length} ステップ</small></button></li>`).join('')}</ul>`;
            return;
        }
        const g = GUIDES.find(x => x.id === state.guide.id);
        const steps = stepsOf(g);
        const cur = state.guide.step;
        bodies.guide.innerHTML = `<button class="back" data-guide-back>← ガイド一覧</button>
            <div class="d-name">${esc(g.title)}</div>
            <ol class="steps">${steps.map((st, i) => {
                const offBoard = st.ctl.filter(id => !hotspots.some(el => el.dataset.ctl === id));
                return `<li><button data-step="${i}" class="${i === cur ? 'is-cur' : i < cur ? 'is-done' : ''}"><span>${esc(st.text)}${
                    offBoard.length ? `<span class="step-note">${esc(offBoard.map(id => CONTROLS[id].name).join('、'))}は${esc(SECTIONS[CONTROLS[offBoard[0]].section])}にあります（図にはありません）。</span>` : ''}</span></button></li>`;
            }).join('')}</ol>
            <div class="step-nav">
                <button data-step-move="-1" ${cur === 0 ? 'disabled' : ''}>前へ</button>
                <button class="primary" data-step-move="1" ${cur === steps.length - 1 ? 'disabled' : ''}>次へ</button>
            </div>`;
    };

    const applyGuideStep = () => {
        const st = currentGuideStep();
        if (!st) return;
        state.shiftLatched = Boolean(st.shift);
        if (st.mode && modeAvailable(st.mode)) state.modes[1] = state.modes[2] = st.mode;
    };

    // ========== 一覧と検索 ==========
    const searchResults = () => {
        const q = state.query.trim().toLowerCase();
        return Object.entries(CONTROLS).map(([id, ctl]) => {
            const acts = actionsOf(id);
            if (!q) return { id, hit: null };
            if (ctl.name.toLowerCase().includes(q)) return { id, hit: '' };
            const a = acts.find(x => (x.how + x.text).toLowerCase().includes(q));
            return a ? { id, hit: (a.shift ? 'SHIFT + ' : '') + a.how + '：' + a.text } : null;
        }).filter(Boolean);
    };

    const highlight = text => {
        const q = state.query.trim();
        if (!q) return esc(text);
        const i = text.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return esc(text);
        return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    };

    const renderIndex = () => {
        const results = searchResults();
        if (!results.length) {
            bodies.index.innerHTML = `<p class="empty">「${esc(state.query)}」に当てはまる機能は見つかりませんでした。</p>`;
            return;
        }
        bodies.index.innerHTML = Object.entries(SECTIONS).map(([key, title]) => {
            const items = results.filter(r => CONTROLS[r.id].section === key);
            if (!items.length) return '';
            return `<div class="idx-section"><h3>${esc(title)}</h3><ul>${items.map(r =>
                `<li><button data-pick="${r.id}" class="${state.sel && state.sel.id === r.id ? 'is-sel' : ''}">${highlight(CONTROLS[r.id].name)}${
                    r.hit ? `<span class="hit">${highlight(r.hit)}</span>` : ''}</button></li>`).join('')}</ul></div>`;
        }).join('');
    };

    // ========== まとめて描画 ==========
    const render = () => {
        proToggle.hidden = family() !== 'se';
        document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
        Object.entries(bodies).forEach(([k, el]) => { el.hidden = k !== state.tab; });
        renderDetail();
        renderGuide();
        renderIndex();
        paintController();
    };

    const select = (sel, { showTab = true } = {}) => {
        state.sel = sel;
        if (showTab) state.tab = 'detail';
        if (sel) history.replaceState(null, '', `#${sel.id}/${sel.deck || ''}/${sel.ch || ''}`);
        render();
    };

    // ========== 操作 ==========
    hotspots.forEach(el => {
        if (el.tagName !== 'BUTTON') {
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
        }
        el.addEventListener('click', () => {
            const id = el.dataset.ctl;
            const deck = deckOf(el);
            const sel = { id, deck, ch: el.dataset.ch ? Number(el.dataset.ch) : null, pad: el.dataset.pad ? Number(el.dataset.pad) : null };
            if (id === 'shift') {
                state.shiftLatched = !state.shiftLatched;
            } else if (id.startsWith('mode-')) {
                const act = actionsOf(id).find(a => a.mode && Boolean(a.shift) === shiftOn());
                if (act) state.modes[deck] = act.mode;
            }
            if (state.tab === 'guide' && state.guide) {
                // ガイド中は図をクリックしてもガイドを閉じない
                state.sel = sel;
                render();
                return;
            }
            select(sel);
            // 1 カラム表示では説明パネルが図の下にあるので、そこまでスクロールする
            if (matchMedia('(max-width: 1000px)').matches) {
                document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        el.addEventListener('keydown', e => {
            if (el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                el.click();
            }
        });
    });

    // ホバー時に名前を出す
    const tip = document.createElement('div');
    tip.className = 'tip';
    tip.hidden = true;
    document.body.appendChild(tip);
    hotspots.forEach(el => {
        el.addEventListener('mouseenter', () => {
            const r = el.getBoundingClientRect();
            tip.textContent = CONTROLS[el.dataset.ctl].name + (shiftOn() && hasShift(el.dataset.ctl) ? '（SHIFT 機能あり）' : '');
            tip.style.left = `${r.left + r.width / 2}px`;
            tip.style.top = `${r.top - 6}px`;
            tip.hidden = false;
        });
        el.addEventListener('mouseleave', () => { tip.hidden = true; });
    });
    addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

    // パネル内のクリック
    document.querySelector('.panel').addEventListener('click', e => {
        const t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.tab) {
            state.tab = t.dataset.tab;
            render();
        } else if (t.dataset.setMode) {
            const deck = Number(t.dataset.deck) || 1;
            state.modes[deck] = t.dataset.setMode;
            select({ id: 'pad', deck, ch: null, pad: null });
        } else if (t.dataset.pickPad) {
            const deck = Number(t.dataset.deck) || 1;
            select({ id: 'pad', deck, ch: null, pad: Number(t.dataset.pickPad) });
        } else if (t.dataset.pick) {
            const id = t.dataset.pick;
            const el = hotspots.find(h => h.dataset.ctl === id);
            select({ id, deck: el ? deckOf(el) : null, ch: el && el.dataset.ch ? Number(el.dataset.ch) : null, pad: null });
        } else if (t.dataset.guide) {
            state.guide = { id: t.dataset.guide, step: 0 };
            applyGuideStep();
            render();
        } else if (t.hasAttribute('data-guide-back')) {
            state.guide = null;
            state.shiftLatched = false;
            render();
        } else if (t.dataset.step) {
            state.guide.step = Number(t.dataset.step);
            applyGuideStep();
            render();
        } else if (t.dataset.stepMove) {
            state.guide.step += Number(t.dataset.stepMove);
            applyGuideStep();
            render();
        }
    });

    // ソフトの切り替え
    document.querySelectorAll('input[name="sw"]').forEach(r => {
        r.addEventListener('change', () => {
            state.sw = r.value;
            store.set('ddj-flx4-sw', state.sw);
            // ソフトによって使えないモードは解除する
            [1, 2].forEach(d => { if (state.modes[d] && !modeAvailable(state.modes[d])) state.modes[d] = null; });
            if (state.guide && !guidesForSw().some(g => g.id === state.guide.id)) state.guide = null;
            render();
        });
    });

    proCheck.addEventListener('change', () => {
        state.showPro = proCheck.checked;
        [1, 2].forEach(d => { if (state.modes[d] && !modeAvailable(state.modes[d])) state.modes[d] = null; });
        render();
    });

    shiftToggle.addEventListener('click', () => {
        state.shiftLatched = !state.shiftLatched;
        render();
    });

    // キーボードの Shift キーを押している間は SHIFT
    const typing = () => document.activeElement && document.activeElement.matches('input[type="search"], input[type="text"]');
    addEventListener('keydown', e => {
        if (e.key === 'Shift' && !typing() && !state.shiftHeld) {
            state.shiftHeld = true;
            render();
        }
    });
    addEventListener('keyup', e => {
        if (e.key === 'Shift' && state.shiftHeld) {
            state.shiftHeld = false;
            render();
        }
    });
    addEventListener('blur', () => {
        if (state.shiftHeld) {
            state.shiftHeld = false;
            render();
        }
    });

    search.addEventListener('input', () => {
        state.query = search.value;
        if (state.query) state.tab = 'index';
        render();
    });

    // ========== 初期状態 ==========
    const savedSw = store.get('ddj-flx4-sw');
    if (savedSw && SOFTWARE[savedSw]) {
        state.sw = savedSw;
        document.querySelector(`input[name="sw"][value="${savedSw}"]`).checked = true;
    }
    // URL の #id/デッキ/チャンネル から選択状態を復元する
    const [hashId, deck, ch] = decodeURIComponent(location.hash.slice(1)).split('/');
    if (hashId && CONTROLS[hashId]) {
        state.sel = { id: hashId, deck: Number(deck) || null, ch: Number(ch) || null, pad: null };
        if (CONTROLS[hashId].section === 'deck' && !state.sel.deck) state.sel.deck = 1;
    }
    render();
    // URL で部品を選んで開いたときも、1 カラム表示なら説明パネルを画面に入れる（クリック時と同じ条件）
    if (state.sel && matchMedia('(max-width: 1000px)').matches) {
        requestAnimationFrame(() => document.querySelector('.panel').scrollIntoView({ block: 'start' }));
    }
});
