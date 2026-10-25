/*
 * レッスンに埋め込む練習ツール。
 * <div data-widget="名前" data-...="設定"></div> を書くと、ページを開いたときにここで組み立てる。
 *
 *   metronome   拍・小節・フレーズを数える（data-track="metronome|beat|halfbeat" data-bpm）
 *   tap-bpm     タップして BPM を測る（data-quiz で、曲の BPM を当てる練習）
 *   structure   曲の構成を見ながら聴く（data-track、data-game="phrase" でフレーズの頭をタップ）
 *   channel     1 チャンネルのミキサー（data-controls="trim eq filter fader"）
 *   cue-deck    CUE・ホットキュー・ジョグの練習
 *   beatmatch   テンポを耳で合わせる練習（data-sync="on" で SYNC ボタンも出す）
 *   mixer       2 デッキのミックス（data-features、data-mission、data-a="曲@セクション"）
 *   key-wheel   キーの相性（Camelot ホイール）
 */
const Widgets = (() => {
    const { TRACKS, Mixer, Deck } = DJAudio;

    // ========== 小さな道具 ==========
    const h = (tag, attrs = {}, ...children) => {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
            if (v === undefined || v === null || v === false) return;
            if (k === 'class') el.className = v;
            else if (k === 'text') el.textContent = v;
            else if (k === 'html') el.innerHTML = v;
            else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v === true ? '' : v);
        });
        children.flat().forEach(c => { if (c !== null && c !== undefined && c !== false) el.append(c); });
        return el;
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const fmtBpm = b => b.toFixed(1);
    const fmtPct = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
    const pos2txt = p => { const { bar, beat } = Deck.barBeat(p); return `${bar}小節 ${beat}拍`; };

    // タッチ端末では dblclick が出ないことがあるので、300ms 以内の 2 回のタップでも fn を呼ぶ
    const onDoubleTap = (el, fn) => {
        let last = 0;
        let down = null;
        el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
        el.addEventListener('pointerup', e => {
            if (e.pointerType === 'mouse' || !down) return;
            const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10;
            down = null;
            if (moved) { last = 0; return; }
            const now = performance.now();
            if (now - last < 300) { last = 0; fn(); } else last = now;
        });
    };

    // つまみ：上下にドラッグ、矢印キー、ダブルクリック（ダブルタップ）で初期値
    const knob = ({ label, value = 0, min = -1, max = 1, def = value, cls = '', onInput, title }) => {
        let v = value;
        const cap = h('div', { class: 'k-cap' }, h('i'));
        const el = h('div', { class: `w-knob ${cls}`, role: 'slider', tabindex: 0, 'aria-label': label, title: title || `${label}（上下にドラッグ。ダブルクリックで元に戻す）` },
            h('div', { class: 'k-body' }, cap), h('span', { class: 'w-label', text: label }));
        const paint = () => {
            cap.style.transform = `rotate(${-135 + (v - min) / (max - min) * 270}deg)`;
            el.setAttribute('aria-valuenow', v.toFixed(2));
            el.classList.toggle('off-center', Math.abs(v - def) > 0.02);
        };
        const set = (nv, fire = true) => {
            v = clamp(nv, min, max);
            paint();
            if (fire && onInput) onInput(v);
        };
        let start = null;
        el.addEventListener('pointerdown', e => {
            el.setPointerCapture(e.pointerId);
            start = { y: e.clientY, x: e.clientX, v };
            e.preventDefault();
        });
        el.addEventListener('pointermove', e => {
            if (!start) return;
            const d = (start.y - e.clientY) + (e.clientX - start.x) * 0.5;
            set(start.v + d / 140 * (max - min));
        });
        const end = () => { start = null; };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('dblclick', () => set(def));
        onDoubleTap(el, () => set(def));
        el.addEventListener('keydown', e => {
            const step = (max - min) / 40;
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(v + step);
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(v - step);
            else if (e.key === 'Home') set(def);
            else return;
            e.preventDefault();
        });
        paint();
        return { el, set, get value() { return v; } };
    };

    // フェーダー：つまみをドラッグ、レールをクリック。Shift を押しながらのドラッグ・矢印キーで細かく動かす
    // step は矢印キー 1 回の量（関数でもよい）。Shift のときはその 1/5
    const fader = ({ label, value = 0, min = 0, max = 1, def = value, vertical = true, cls = '', onInput, title, center = false, step = (max - min) / 50 }) => {
        let v = value;
        const knobEl = h('div', { class: 'f-cap' });
        const rail = h('div', { class: 'f-rail' }, center ? h('div', { class: 'f-center' }) : null, knobEl);
        const el = h('div', { class: `w-fader ${vertical ? 'v' : 'h'} ${cls}`, role: 'slider', tabindex: 0, 'aria-label': label, 'aria-orientation': vertical ? 'vertical' : 'horizontal', title: title || label },
            rail, label ? h('span', { class: 'w-label', text: label }) : null);
        const paint = () => {
            const r = (v - min) / (max - min);
            if (vertical) knobEl.style.bottom = `calc(${r * 100}% - ${r * 14}px)`;
            else knobEl.style.left = `calc(${r * 100}% - ${r * 26}px)`;
            el.setAttribute('aria-valuenow', v.toFixed(2));
        };
        const set = (nv, fire = true) => {
            v = clamp(nv, min, max);
            paint();
            if (fire && onInput) onInput(v);
        };
        const fromPointer = e => {
            const r = rail.getBoundingClientRect();
            const ratio = vertical ? 1 - (e.clientY - r.top - 7) / (r.height - 14) : (e.clientX - r.left - 13) / (r.width - 26);
            set(min + clamp(ratio, 0, 1) * (max - min));
        };
        // drag.rel：Shift を押したあとは、つまみが指先に飛ばないように動かした量だけ動かす
        let drag = null;
        const along = e => (vertical ? -e.clientY : e.clientX);
        el.addEventListener('pointerdown', e => {
            drag = { rel: e.shiftKey, at: along(e) };
            el.setPointerCapture(e.pointerId);
            if (!drag.rel) fromPointer(e);
            e.preventDefault();
        });
        el.addEventListener('pointermove', e => {
            if (!drag) return;
            const at = along(e);
            const d = at - drag.at;
            drag.at = at;
            if (e.shiftKey) drag.rel = true;
            if (!drag.rel) { fromPointer(e); return; }
            const r = rail.getBoundingClientRect();
            const len = Math.max(1, (vertical ? r.height - 14 : r.width - 26));
            set(v + d / len * (max - min) / (e.shiftKey ? 10 : 1));
        });
        el.addEventListener('pointerup', () => { drag = null; });
        el.addEventListener('pointercancel', () => { drag = null; });
        el.addEventListener('dblclick', () => set(def));
        onDoubleTap(el, () => set(def));
        el.addEventListener('keydown', e => {
            const st = (typeof step === 'function' ? step() : step) / (e.shiftKey ? 5 : 1);
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') set(v + st);
            else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') set(v - st);
            else if (e.key === 'Home') set(def);
            else return;
            e.preventDefault();
        });
        paint();
        return { el, set, get value() { return v; } };
    };

    // ボタン：押した瞬間（down）と離した瞬間（up）も扱える
    const btn = (label, { cls = '', onClick, onDown, onUp, title, pressed } = {}) => {
        const el = h('button', { type: 'button', class: `w-btn ${cls}`, title, 'aria-pressed': pressed === undefined ? undefined : String(pressed) });
        el.innerHTML = label;
        if (onClick) el.addEventListener('click', onClick);
        if (onDown) {
            el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); el.classList.add('held'); onDown(e); e.preventDefault(); });
            const up = e => { if (!el.classList.contains('held')) return; el.classList.remove('held'); if (onUp) onUp(e); };
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
            el.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { el.classList.add('held'); onDown(e); e.preventDefault(); } });
            el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { up(e); e.preventDefault(); } });
        }
        return el;
    };

    // レベルメーター
    const meter = (segments = [-30, -24, -18, -12, -9, -6, -3]) => {
        const leds = segments.map((db, i) => h('i', { class: i === segments.length - 1 ? 'peak' : '' }));
        const el = h('div', { class: 'w-meter', 'aria-hidden': 'true' }, leds.slice().reverse());
        let hold = -Infinity;
        let holdUntil = 0;
        return {
            el,
            set(db) {
                const now = performance.now();
                if (db > hold || now > holdUntil) { hold = db; holdUntil = now + 500; }
                leds.forEach((led, i) => {
                    led.classList.toggle('on', db >= segments[i]);
                    led.classList.toggle('hold', db < segments[i] && hold >= segments[i] && (i === segments.length - 1 || hold < segments[i + 1]));
                });
            },
        };
    };

    // ジョグ：回すと角度の変化を返す
    const jog = ({ onTurn, onRelease, label = 'ジョグ' }) => {
        const mark = h('div', { class: 'j-mark' });
        const el = h('div', { class: 'w-jog', role: 'img', 'aria-label': `${label}（ドラッグして回す）`, title: `${label}：ドラッグして回す` }, h('div', { class: 'j-top' }, mark));
        let last = null;
        let angle = 0;
        const angleOf = e => {
            const r = el.getBoundingClientRect();
            return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
        };
        el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); last = { a: angleOf(e), t: performance.now() }; e.preventDefault(); });
        el.addEventListener('pointermove', e => {
            if (!last) return;
            const a = angleOf(e);
            let d = a - last.a;
            if (d > 180) d -= 360;
            if (d < -180) d += 360;
            const now = performance.now();
            const dt = Math.max(1, now - last.t);
            last = { a, t: now };
            angle += d;
            mark.style.transform = `rotate(${angle}deg)`;
            onTurn(d, d / dt);
        });
        const end = () => { if (!last) return; last = null; if (onRelease) onRelease(); };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        return { el, spin(deg) { angle += deg; mark.style.transform = `rotate(${angle}deg)`; } };
    };

    // ========== 波形 ==========
    const COLORS = { low: '#2f7fe6', mid: '#f0a33a', high: '#f4f4f4' };
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);

    const fitCanvas = cv => {
        const w = cv.clientWidth;
        const hh = cv.clientHeight;
        const r = dpr();
        if (cv.width !== Math.round(w * r) || cv.height !== Math.round(hh * r)) {
            cv.width = Math.round(w * r);
            cv.height = Math.round(hh * r);
        }
        const g = cv.getContext('2d');
        g.setTransform(r, 0, 0, r, 0, 0);
        return { g, w, h: hh };
    };

    const drawColumn = (g, x, w, mid, hh, v) => {
        const [lo, md, hi] = v;
        g.fillStyle = COLORS.low;
        g.fillRect(x, mid - lo * hh, w, lo * hh * 2);
        g.fillStyle = COLORS.mid;
        g.fillRect(x, mid - md * hh * 0.75, w, md * hh * 1.5);
        g.fillStyle = COLORS.high;
        g.fillRect(x, mid - hi * hh * 0.5, w, hi * hh);
    };

    // 曲全体の波形（セクション名、CUE、ループ、再生位置）
    const overview = (deck, { seekable = true, hideLabels = false } = {}) => {
        const cv = h('canvas', { class: 'w-overview', 'aria-label': '曲全体の波形' });
        let labelsHidden = hideLabels;
        const draw = () => {
            const { g, w, h: hh } = fitCanvas(cv);
            if (!w) return;
            const tr = deck.track;
            const wave = DJAudio.waveformOf(tr);
            g.clearRect(0, 0, w, hh);
            const top = labelsHidden ? 2 : 16;
            const mid = top + (hh - top) / 2;
            const amp = (hh - top) / 2 - 2;
            // セクションの帯
            tr.sections.forEach((s, i) => {
                const x0 = s.start / tr.beats * w;
                const x1 = s.end / tr.beats * w;
                g.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
                g.fillRect(x0, top, x1 - x0, hh - top);
                if (!labelsHidden && s.label) {
                    g.fillStyle = '#9aa0a8';
                    g.font = '10px "Hiragino Sans", sans-serif';
                    g.fillText(s.label, x0 + 3, 11, x1 - x0 - 4);
                }
                g.fillStyle = 'rgba(255,255,255,0.18)';
                g.fillRect(Math.round(x0), top, 1, hh - top);
            });
            // 8 小節ごとの目盛り
            for (let b = 32; b < tr.beats; b += 32) {
                g.fillStyle = 'rgba(255,255,255,0.10)';
                g.fillRect(Math.round(b / tr.beats * w), hh - 4, 1, 4);
            }
            const steps = wave.length;
            const per = steps / w;
            for (let x = 0; x < w; x++) {
                // 1 列に入る範囲より少し広く見て、キックだけの部分が縞模様にならないようにする
                const a = Math.max(0, Math.floor(x * per) - 2);
                const b = Math.max(a + 1, Math.floor((x + 1) * per) + 2);
                const v = [0, 0, 0];
                for (let i = a; i < b && i < steps; i++) for (let k = 0; k < 3; k++) v[k] = Math.max(v[k], wave[i][k]);
                drawColumn(g, x, 1, mid, amp, v);
            }
            // 再生済みは暗く
            const px = deck.pos / tr.beats * w;
            g.fillStyle = 'rgba(16,17,19,0.55)';
            g.fillRect(0, top, px, hh - top);
            // ループ
            if (deck.loop) {
                g.fillStyle = 'rgba(236,140,40,0.35)';
                g.fillRect(deck.loop.start / tr.beats * w, top, Math.max(2, (deck.loop.end - deck.loop.start) / tr.beats * w), hh - top);
            }
            // CUE とホットキュー
            g.fillStyle = '#ff8a1f';
            g.beginPath();
            const cx = deck.cuePoint / tr.beats * w;
            g.moveTo(cx - 4, hh); g.lineTo(cx + 4, hh); g.lineTo(cx, hh - 6); g.fill();
            deck.hotcues.forEach((hc, i) => {
                if (hc === null) return;
                const x = hc / tr.beats * w;
                g.fillStyle = HOTCUE_COLORS[i];
                g.fillRect(x - 1, top, 2, 6);
            });
            g.fillStyle = '#ff3b30';
            g.fillRect(Math.round(px) - 1, top - 2, 2, hh - top + 2);
        };
        if (seekable) {
            cv.addEventListener('pointerdown', e => {
                const r = cv.getBoundingClientRect();
                const beat = (e.clientX - r.left) / r.width * deck.track.beats;
                deck.seek(Math.round(beat), { keepPhase: deck.playing });
            });
            cv.classList.add('seekable');
            cv.title = 'クリックした位置に移動';
        }
        return { el: cv, draw, set hideLabels(v) { labelsHidden = v; } };
    };

    // 再生位置のまわりを拡大した波形（拍と小節の線つき）
    const zoom = (deck, { beats = 16 } = {}) => {
        const cv = h('canvas', { class: 'w-zoom', 'aria-label': '再生位置のまわりの波形' });
        const draw = () => {
            const { g, w, h: hh } = fitCanvas(cv);
            if (!w) return;
            const wave = DJAudio.waveformOf(deck.track);
            g.clearRect(0, 0, w, hh);
            const pos = deck.pos;
            const pxPerBeat = w / beats;
            const startBeat = pos - beats / 2;
            const mid = hh / 2;
            const colW = pxPerBeat / 4;
            const firstStep = Math.floor(startBeat * 4);
            for (let st = firstStep; st < firstStep + beats * 4 + 2; st++) {
                if (st < 0 || st >= wave.length) continue;
                const x = (st / 4 - startBeat) * pxPerBeat;
                drawColumn(g, x + 0.5, Math.max(1, colW - 1), mid, mid - 3, wave[st]);
            }
            // 拍の線（小節の頭は太く）
            for (let b = Math.ceil(startBeat); b <= startBeat + beats; b++) {
                if (b < 0) continue;
                const x = (b - startBeat) * pxPerBeat;
                const barHead = b % 4 === 0;
                const phraseHead = b % 32 === 0;
                // rekordbox に合わせて、拍は白、小節の頭は赤。8 小節（フレーズ）の頭はオレンジの太線
                g.fillStyle = phraseHead ? 'rgba(255,150,40,0.95)' : barHead ? 'rgba(255,80,80,0.85)' : 'rgba(255,255,255,0.22)';
                g.fillRect(Math.round(x), 0, phraseHead ? 3 : barHead ? 2 : 1, hh);
            }
            if (deck.loop) {
                g.fillStyle = 'rgba(236,140,40,0.22)';
                g.fillRect((deck.loop.start - startBeat) * pxPerBeat, 0, (deck.loop.end - deck.loop.start) * pxPerBeat, hh);
            }
            const cx = (deck.cuePoint - startBeat) * pxPerBeat;
            g.fillStyle = '#ff8a1f';
            g.beginPath(); g.moveTo(cx - 5, 0); g.lineTo(cx + 5, 0); g.lineTo(cx, 7); g.fill();
            g.fillStyle = '#fff';
            g.fillRect(Math.round(w / 2) - 1, 0, 2, hh);
        };
        return { el: cv, draw };
    };

    const HOTCUE_COLORS = ['#e8433a', '#f08a24', '#e9c42c', '#41b85c', '#2fb3d6', '#3d6fe0', '#8d53d6', '#d64fa0'];
    const HOTCUE_NAMES = 'ABCDEFGH'.split('');

    // ========== 描画ループ（画面に見えているウィジェットだけ描く） ==========
    const live = new Set();
    const visible = new WeakSet();
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
    }) : null;
    const loop = () => {
        // 1 つのツールで例外が出ても、ほかのツールの描画は止めない（同じツールのエラーは 1 回だけ出す）
        live.forEach(w => {
            if (io && !visible.has(w.root)) return;
            try { w.frame(); } catch (e) { if (!w.failed) { w.failed = true; console.error(e); } }
        });
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const register = w => {
        w.root.widget = w;
        live.add(w);
        if (io) io.observe(w.root);
        else visible.add(w.root);
        return w;
    };

    // ウィジェットの外枠
    const frameEl = (root, title, hint) => {
        root.classList.add('w');
        root.append(h('div', { class: 'w-head' }, h('span', { class: 'w-title', text: title }), hint ? h('span', { class: 'w-hint', text: hint }) : null));
        const body = h('div', { class: 'w-body' });
        root.append(body);
        return body;
    };

    const audioNote = () => h('p', { class: 'w-note', text: '音が出ます。音量に注意してください。音はこのページの中で合成しています。' });

    // 曲を写しとって、テンポなどを変えても元の曲に影響しないようにする
    const trackCopy = (id, patch = {}) => ({ ...TRACKS[id], ...patch, wave: TRACKS[id].wave });

    // セクション名から開始位置（拍）を求める（「ドロップ」「アウトロ+8」など。+ のあとは小節数）
    const sectionBeat = (track, spec) => {
        if (!spec) return 0;
        const [name, plus] = spec.split('+');
        const s = track.sections.find(x => x.label === name);
        return (s ? s.start : 0) + (Number(plus) || 0) * 4;
    };

    // ========== ビートカウンター ==========
    const metronome = root => {
        const mixer = new Mixer(1);
        const kind = root.dataset.track || 'beat';
        let track = trackCopy(kind, { bpm: Number(root.dataset.bpm) || TRACKS[kind].bpm });
        const deck = new Deck(mixer, 0, track);
        mixer.setMasterLevel(0.7);
        const body = frameEl(root, root.dataset.title || 'ビートカウンター', '再生して、1・2・3・4 と声に出して数えてみよう');

        const beats = [1, 2, 3, 4].map(i => h('div', { class: `mc-beat${i === 1 ? ' head' : ''}`, text: i }));
        const bars = Array.from({ length: 8 }, (_, i) => h('div', { class: 'mc-bar', text: i + 1 }));
        const barText = h('span', { class: 'mc-big' });
        const phraseText = h('span', { class: 'mc-big' });
        const bpmVal = h('output', { class: 'w-value' });
        const play = btn('▶ 再生', { cls: 'primary', onClick: () => deck.toggle() });
        const setBpm = v => {
            track.bpm = Math.round(v);
            bpmVal.textContent = `${track.bpm} BPM`;
            if (deck.playing) deck.reanchor();
        };
        const bpmSlider = fader({ label: '', value: track.bpm, min: 70, max: 180, vertical: false, cls: 'wide', onInput: setBpm, title: 'BPM' });
        const soundSel = h('select', { class: 'w-select', 'aria-label': '音の種類',
            onchange: e => {
                const wasPlaying = deck.playing;
                const b = deck.pos;
                track = trackCopy(e.target.value, { bpm: track.bpm });
                deck.load(track);
                if (wasPlaying) { deck.seek(b); deck.play(); }
            } },
            h('option', { value: 'beat', text: 'ドラム（4 つ打ち）', selected: kind === 'beat' }), h('option', { value: 'metronome', text: 'クリック', selected: kind === 'metronome' }),
            h('option', { value: 'halfbeat', text: 'ドラム（半テン）', selected: kind === 'halfbeat' }));

        body.append(
            h('div', { class: 'w-row' }, play, h('div', { class: 'w-field grow' }, h('span', { class: 'w-label', text: 'テンポ' }), bpmSlider.el, bpmVal), soundSel),
            h('div', { class: 'mc-beats' }, beats),
            h('div', { class: 'mc-stats' },
                h('div', {}, h('span', { class: 'w-label', text: '小節' }), barText),
                h('div', {}, h('span', { class: 'w-label', text: 'フレーズ（8 小節）' }), phraseText)),
            h('div', { class: 'mc-bars', 'aria-label': 'フレーズの中の小節' }, bars),
            audioNote());
        setBpm(track.bpm);

        // 止めたら 1 拍目に戻す
        deck.onChange = what => {
            if (what !== 'play') return;
            play.innerHTML = deck.playing ? '■ 停止' : '▶ 再生';
            if (!deck.playing) deck.seek(0);
        };
        return register({
            root, mixer, decks: [deck],
            frame() {
                const p = deck.pos;
                const b = Math.floor(p + 1e-6);
                const frac = p - b;
                beats.forEach((el, i) => el.classList.toggle('on', deck.playing && b % 4 === i && frac < 0.5));
                const barInPhrase = Math.floor(b / 4) % 8;
                bars.forEach((el, i) => {
                    el.classList.toggle('on', deck.playing && i === barInPhrase);
                    el.classList.toggle('past', deck.playing && i < barInPhrase);
                });
                barText.textContent = deck.playing ? `${Math.floor(b / 4) + 1}` : '-';
                phraseText.textContent = deck.playing ? `${Math.floor(b / 32) + 1} 個目の ${barInPhrase + 1} 小節目` : '-';
            },
        });
    };

    // ========== BPM タップ ==========
    const tapBpm = root => {
        const quiz = root.hasAttribute('data-quiz');
        const body = frameEl(root, quiz ? 'BPM を当てよう' : 'BPM タップ', quiz ? '曲を流して、キックに合わせてタップ' : 'リズムに合わせて 8 回以上タップ');
        let taps = [];
        const out = h('div', { class: 'tap-out', text: '---' });
        const info = h('p', { class: 'w-msg', text: 'ボタンをクリック（またはこの枠を選んでスペースキー）でタップします。' });
        let mixer = null;
        let deck = null;
        let answer = null;
        const doTap = () => {
            const now = performance.now();
            if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
            taps.push(now);
            if (taps.length > 16) taps.shift();
            tapBtn.classList.remove('flash');
            void tapBtn.offsetWidth;
            tapBtn.classList.add('flash');
            if (taps.length < 2) { out.textContent = '...'; return; }
            const avg = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
            out.textContent = (60000 / avg).toFixed(1);
            info.textContent = taps.length < 8 ? `${taps.length} 回タップ。続けるほど正確になります。` : `${taps.length} 回分の平均です。`;
        };
        const tapBtn = btn('TAP', { cls: 'tap', onDown: doTap });
        const row = h('div', { class: 'w-row center' }, tapBtn, out, h('span', { class: 'w-unit', text: 'BPM' }));
        body.append(row, info);
        if (quiz) {
            mixer = new Mixer(1);
            const reveal = h('p', { class: 'w-msg strong' });
            const newQ = () => {
                answer = 100 + Math.floor(Math.random() * 41);
                const wasPlaying = deck && deck.playing;
                if (!deck) deck = new Deck(mixer, 0, trackCopy('beat', { bpm: answer }));
                else { deck.load(trackCopy('beat', { bpm: answer })); }
                reveal.textContent = '';
                taps = [];
                out.textContent = '---';
                if (wasPlaying) deck.play();
            };
            const playB = btn('▶ 曲を流す', { cls: 'primary', onClick: () => { deck.toggle(); playB.innerHTML = deck.playing ? '■ 止める' : '▶ 曲を流す'; } });
            const showB = btn('答えを見る', { onClick: () => {
                const mine = Number(out.textContent);
                reveal.textContent = `正解は ${answer} BPM。` + (Number.isFinite(mine) ? ` あなたの測定は ${mine.toFixed(1)}（差 ${Math.abs(mine - answer).toFixed(1)}）。` : '');
            } });
            body.prepend(h('div', { class: 'w-row' }, playB, showB, btn('次の問題', { onClick: newQ })));
            body.append(reveal, audioNote());
            newQ();
        }
        root.tabIndex = 0;
        root.addEventListener('keydown', e => {
            if (e.key === ' ' && e.target === root) { e.preventDefault(); if (!e.repeat) doTap(); }
        });
        return register({ root, frame() {}, stopAll() { if (deck) deck.pause(); } });
    };

    // ========== 曲の構成プレイヤー ==========
    const structure = root => {
        const mixer = new Mixer(1);
        const deck = new Deck(mixer, 0, root.dataset.track || 'sunrise');
        const game = root.dataset.game === 'phrase';
        const body = frameEl(root, root.dataset.title || `曲の構成：${deck.track.title}`, game ? '新しいフレーズが始まる瞬間にタップ' : '波形をクリックするとその位置から再生');
        const ov = overview(deck, { hideLabels: root.hasAttribute('data-hide-labels') });
        const zm = zoom(deck, { beats: 32 });
        const play = btn('▶ 再生', { cls: 'primary', onClick: () => deck.toggle() });
        const pos = h('span', { class: 'w-pos' });
        const sec = h('span', { class: 'w-sec' });
        const phraseBars = Array.from({ length: 8 }, (_, i) => h('div', { class: 'mc-bar', text: i + 1 }));
        const barsEl = h('div', { class: 'mc-bars small' }, phraseBars);
        body.append(ov.el, zm.el,
            h('div', { class: 'w-row' }, play, pos, sec),
            barsEl);
        // 「隠す」モード：セクション名・拡大波形・小節の表示（インジケーターと「N 小節 M 拍」）を隠す
        const setHidden = on => { ov.hideLabels = on; zm.el.hidden = on; barsEl.hidden = on; pos.hidden = on; };

        let msg = null;
        if (game) {
            let hits = 0;
            let tries = 0;
            const score = h('span', { class: 'w-value' });
            msg = h('p', { class: 'w-msg', text: '再生して、8 小節ごとに音が変わる瞬間を待とう。' });
            const tapNow = () => {
                if (!deck.playing) { msg.textContent = 'まず再生してください。'; return; }
                const p = deck.pos;
                const nearest = Math.round(p / 32) * 32;
                const d = p - nearest;
                tries++;
                if (Math.abs(d) <= 0.75 && nearest > 0) {
                    hits++;
                    msg.textContent = `ぴったり！ ${Math.floor(nearest / 4) + 1} 小節目から新しいフレーズです。`;
                    msg.className = 'w-msg good';
                } else {
                    const next = Math.ceil(p / 32) * 32;
                    const left = next - p;
                    msg.textContent = d < 0 || left < 16
                        ? `少し早い。フレーズの頭まであと ${left.toFixed(1)} 拍でした。`
                        : `いまはフレーズの途中（${Math.floor((p % 32) / 4) + 1} 小節目）です。`;
                    msg.className = 'w-msg bad';
                }
                score.textContent = `${hits} / ${tries}`;
            };
            const tapBtn = btn('ここだ！', { cls: 'tap small', onDown: tapNow, title: 'スペースキーでもタップできます' });
            const hide = h('label', { class: 'w-check' }, h('input', { type: 'checkbox', checked: root.hasAttribute('data-hide-labels'), onchange: e => setHidden(e.target.checked) }), 'セクション名・拡大波形・小節の表示を隠す');
            body.append(h('div', { class: 'w-row' }, tapBtn, h('span', { class: 'w-label', text: '成功' }), score, hide), msg);
            root.tabIndex = 0;
            root.addEventListener('keydown', e => { if (e.key === ' ' && e.target === root) { e.preventDefault(); if (!e.repeat) tapNow(); } });
            if (root.hasAttribute('data-hide-labels')) setHidden(true);
        }
        body.append(audioNote());
        deck.onChange = () => { play.innerHTML = deck.playing ? '❚❚ 一時停止' : '▶ 再生'; };
        return register({
            root, mixer, decks: [deck],
            frame() {
                ov.draw();
                if (!zm.el.hidden) zm.draw();
                const p = deck.pos;
                pos.textContent = pos2txt(p);
                const s = deck.sectionAt(p);
                sec.textContent = ov.el && !(game && zm.el.hidden) && s.label ? s.label : '';
                const barInPhrase = Math.floor(Math.floor(p + 1e-6) / 4) % 8;
                phraseBars.forEach((el, i) => { el.classList.toggle('on', i === barInPhrase); el.classList.toggle('past', i < barInPhrase); });
            },
        });
    };

    // ========== 1 チャンネルのミキサー ==========
    const channel = root => {
        const mixer = new Mixer(1);
        const deck = new Deck(mixer, 0, root.dataset.track || 'sunrise');
        const controls = (root.dataset.controls || 'trim eq fader').split(/\s+/);
        const body = frameEl(root, root.dataset.title || 'チャンネルの音を調整する', 'つまみは上下にドラッグ、ダブルクリックで元の位置');
        const start = sectionBeat(deck.track, root.dataset.start || 'ドロップ');
        deck.seek(start);
        deck.cuePoint = start;
        mixer.setTrim(0, Number(root.dataset.trim ?? 0.5));

        const play = btn('▶ 再生', { cls: 'primary', onClick: () => deck.toggle() });
        const ov = overview(deck);
        const m = meter();
        const strip = h('div', { class: 'ch-strip' });
        const ctl = {};
        if (controls.includes('trim')) { ctl.trim = knob({ label: 'TRIM', value: mixer.ch[0].state.trim, min: 0, max: 1, onInput: v => mixer.setTrim(0, v) }); strip.append(ctl.trim.el); }
        if (controls.includes('eq')) ['high', 'mid', 'low'].forEach(b => {
            ctl[b] = knob({ label: b.toUpperCase().replace('HIGH', 'HI'), value: 0, onInput: v => mixer.setEq(0, b, v) });
            strip.append(ctl[b].el);
        });
        if (controls.includes('filter')) { ctl.filter = knob({ label: 'CFX', value: 0, cls: 'cfx', onInput: v => mixer.setFilter(0, v), title: 'CFX（フィルター）：左でローパス、右でハイパス' }); strip.append(ctl.filter.el); }
        const faderBox = h('div', { class: 'ch-fader' }, m.el);
        if (controls.includes('fader')) { ctl.fader = fader({ label: 'フェーダー', value: 1, onInput: v => mixer.setFader(0, v) }); faderBox.append(ctl.fader.el); }
        strip.append(faderBox);

        const bands = ['low', 'mid', 'high'].map(b => h('div', { class: `band ${b}` }, h('i'), h('span', { text: { low: '低音', mid: '中音', high: '高音' }[b] })));
        const clip = h('span', { class: 'w-clip', text: '音割れ' });
        const msg = h('p', { class: 'w-msg' });
        body.append(ov.el, h('div', { class: 'w-row' }, play, h('span', { class: 'w-label', text: '練習曲' }), h('span', { class: 'w-value', text: deck.track.title }), clip),
            h('div', { class: 'ch-layout' }, strip, h('div', { class: 'band-view' }, h('span', { class: 'w-label', text: 'いま鳴っている音の高さの分布' }), h('div', { class: 'bands' }, bands))),
            msg, audioNote());
        deck.onChange = () => { play.innerHTML = deck.playing ? '❚❚ 一時停止' : '▶ 再生'; };
        let quiet = 0;
        return register({
            root, mixer, decks: [deck],
            frame() {
                ov.draw();
                const lv = mixer.levels();
                m.set(lv.ch[0]);
                clip.classList.toggle('on', lv.clip);
                const bv = mixer.bands();
                bands.forEach((el, i) => { el.firstChild.style.height = `${Math.round([bv.low, bv.mid, bv.high][i] * 100)}%`; });
                if (deck.playing) {
                    if (lv.clip) msg.textContent = '赤い「音割れ」が点いています。TRIM を下げましょう。';
                    else if (lv.ch[0] >= -3) msg.textContent = 'いちばん上（オレンジ）が点いています。ときどき点くくらいがちょうどいい音量です。';
                    else if (lv.ch[0] < -18) { quiet++; if (quiet > 30) msg.textContent = '音が小さめです。TRIM を上げてみましょう。'; }
                    else { quiet = 0; msg.textContent = ''; }
                }
            },
        });
    };

    // ========== CUE の練習 ==========
    const cueDeck = root => {
        const mixer = new Mixer(1);
        const deck = new Deck(mixer, 0, root.dataset.track || 'sunrise');
        const body = frameEl(root, root.dataset.title || 'CUE とホットキューの練習', 'CUE は押している間も意味がある。長押しも試そう');
        const ov = overview(deck);
        const zm = zoom(deck, { beats: 16 });
        const posEl = h('span', { class: 'w-pos' });
        const cueEl = h('span', { class: 'w-value' });
        const log = h('p', { class: 'w-msg', text: '一時停止のまま波形をクリックするかジョグを回して位置を決め、CUE を押してみよう。' });
        let shift = false;
        const say = t => { log.textContent = t; };

        const play = btn('▶/❚❚', { cls: 'play', title: 'PLAY/PAUSE', onClick: () => {
            const was = deck.playing;
            deck.playButton();
            if (deck.cueHeld) say('CUE を押したまま PLAY を押したので、CUE を離しても再生が続きます。');
            else say(was ? '一時停止しました。' : '再生します。');
        } });
        const cue = btn('CUE', { cls: 'cue', title: 'CUE（押す・押し続ける）',
            onDown: () => {
                const was = deck.playing;
                const before = deck.cuePoint;
                deck.cueDown();
                if (was && !deck.cueHeld) say(`再生中に CUE を押したので、CUE ポイント（${pos2txt(deck.cuePoint)}）に戻って一時停止しました。`);
                else if (deck.cueHeld) say('CUE ポイントで CUE を押し続けているので、押している間だけ再生しています。離すと CUE ポイントに戻ります。');
                else if (before !== deck.cuePoint) say(`一時停止中に CUE を押したので、いまの位置（${pos2txt(deck.cuePoint)}）が新しい CUE ポイントになりました。`);
            },
            onUp: () => {
                if (!deck.cueHeld) return;
                const latched = deck.playLatched;
                deck.cueUp();
                if (!latched) say('CUE を離したので、CUE ポイントに戻りました。');
            } });
        const jg = jog({
            onTurn: (deg, vel) => {
                if (deck.playing) deck.setNudge(clamp(vel * 0.06, -0.08, 0.08));
                else deck.scrub(deg / 90);
            },
            onRelease: () => { if (deck.nudge) deck.setNudge(0); },
        });
        // SHIFT はマウスでも使えるように、押すたびにオン・オフ（パッドを 1 回使うと自動でオフ）
        const setShift = on => { shift = on; shiftBtn.classList.toggle('on', on); shiftBtn.setAttribute('aria-pressed', String(on)); };
        const shiftBtn = btn('SHIFT', { cls: 'shift', pressed: false, onClick: () => setShift(!shift), title: 'SHIFT を押してからパッドを押すとホットキューを消す（Shift キーを押しながらクリックでも消せる）' });
        const pads = HOTCUE_NAMES.slice(0, 4).map((name, i) => btn(name, { cls: 'pad', onClick: e => {
            if (shift || e.shiftKey) {
                setShift(false);
                if (deck.hotcues[i] === null) return say(`ホットキュー ${name} は空です。`);
                deck.clearHotcue(i);
                return say(`SHIFT とパッドを押したので、ホットキュー ${name} を消しました。`);
            }
            const r = deck.hotcue(i);
            say(r === 'set'
                ? `ホットキュー ${name} を ${pos2txt(deck.hotcues[i])} に登録しました。もう一度押すと、いつでもここへ飛べます。`
                : `ホットキュー ${name}（${pos2txt(deck.hotcues[i])}）へ飛びました。`);
        } }));
        const quant = h('label', { class: 'w-check', title: 'オンにすると CUE やホットキューの位置が拍にそろう' }, h('input', { type: 'checkbox', checked: true, onchange: e => { deck.quantize = e.target.checked; } }), 'クオンタイズ（拍にそろえる）');

        body.append(ov.el, zm.el,
            h('div', { class: 'w-row' }, h('span', { class: 'w-label', text: '位置' }), posEl, h('span', { class: 'w-label', text: 'CUE ポイント' }), cueEl, quant),
            h('div', { class: 'deck-controls' },
                h('div', { class: 'transport' }, cue, play),
                jg.el,
                h('div', { class: 'pad-block' }, h('span', { class: 'w-label', text: 'HOT CUE' }), h('div', { class: 'pads four' }, pads), shiftBtn)),
            log, audioNote());
        deck.onChange = () => { play.classList.toggle('on', deck.playing); };
        return register({
            root, mixer, decks: [deck],
            frame() {
                ov.draw();
                zm.draw();
                posEl.textContent = pos2txt(deck.pos);
                cueEl.textContent = pos2txt(deck.cuePoint);
                pads.forEach((p, i) => { p.style.setProperty('--pad', deck.hotcues[i] === null ? '' : HOTCUE_COLORS[i]); p.classList.toggle('set', deck.hotcues[i] !== null); });
                cue.classList.toggle('blink', !deck.playing && Math.abs(deck.pos - deck.cuePoint) > 0.01);
            },
        });
    };

    // ========== デッキの操作部（ミックス練習とビートマッチで使う） ==========
    const deckPanel = (w, deck, other, opts) => {
        const side = deck.index === 0 ? 'left' : 'right';
        const name = deck.index === 0 ? 'DECK 1' : 'DECK 2';
        const ov = overview(deck, { seekable: opts.seekable !== false });
        const title = h('span', { class: 'dk-title' });
        const bpmEl = h('span', { class: 'dk-bpm' });
        const posEl = h('span', { class: 'w-pos' });
        const secEl = h('span', { class: 'w-sec' });
        const play = btn('▶/❚❚', { cls: 'play', title: 'PLAY/PAUSE', onClick: () => deck.playButton() });
        const cue = btn('CUE', { cls: 'cue', title: 'CUE', onDown: () => deck.cueDown(), onUp: () => deck.cueUp() });
        const tempoPct = h('span', { class: 'dk-tempo' });
        // 矢印キー 1 回で 0.1 BPM、Shift を押しながらで 0.02 BPM
        const tempo = fader({ label: 'TEMPO', value: deck.tempo, min: -1, max: 1, def: 0, center: true, cls: 'tempo', step: () => 0.1 / (deck.track.bpm * deck.range),
            title: 'テンポスライダー（手前に動かすと速くなる。Shift を押しながらドラッグ・矢印キーで細かく動く。ダブルクリックで中央）', onInput: v => deck.setTempo(-v) });
        tempo.set(-deck.tempo, false);
        const jg = jog({
            onTurn: (deg, vel) => {
                if (deck.playing) deck.setNudge(clamp(vel * 0.06, -0.08, 0.08));
                else deck.scrub(deg / 90);
            },
            onRelease: () => { if (deck.nudge) deck.setNudge(0); },
        });
        const parts = [];
        const head = h('div', { class: 'dk-head' }, h('span', { class: 'dk-name', text: name }), title, bpmEl);
        parts.push(head, ov.el);
        const info = h('div', { class: 'w-row tight' }, posEl, secEl);
        parts.push(info);
        let sync = null;
        if (opts.sync) {
            sync = btn('BEAT SYNC', { cls: 'sync', onClick: () => { deck.syncTo(other); tempo.set(-deck.tempo, false); w.synced[deck.index] = true; }, title: 'もう一方のデッキにテンポと拍を合わせる' });
        }
        // 小さな画面では ±ボタンでも合わせられるように
        const nudgeBtns = h('div', { class: 'nudge' },
            btn('−', { title: '押している間だけ少し遅くする（ジョグの側面を左に回すのと同じ）', onDown: () => deck.setNudge(-0.04), onUp: () => deck.setNudge(0) }),
            h('span', { class: 'w-label', text: 'ジョグ' }),
            btn('＋', { title: '押している間だけ少し速くする', onDown: () => deck.setNudge(0.04), onUp: () => deck.setNudge(0) }));
        const controls = h('div', { class: 'deck-controls' },
            h('div', { class: 'transport' }, cue, play, sync),
            h('div', { class: 'jog-col' }, jg.el, nudgeBtns),
            h('div', { class: 'tempo-col' }, tempo.el, tempoPct));
        parts.push(controls);

        let pads = null;
        if (opts.pads) {
            pads = HOTCUE_NAMES.slice(0, 4).map((n, i) => btn(n, { cls: 'pad', onClick: e => { if (e.shiftKey) deck.clearHotcue(i); else deck.hotcue(i); }, title: 'ホットキュー（Shift キーを押しながらクリックで消去）' }));
            parts.push(h('div', { class: 'pad-block row' }, h('span', { class: 'w-label', text: 'HOT CUE' }), h('div', { class: 'pads four' }, pads)));
        }
        let loopEls = null;
        if (opts.loop) {
            const lp = btn('4 BEAT', { cls: 'loop', title: '4 拍のループ（ループ中はループを抜ける）', onClick: () => { if (deck.loop) deck.exitLoop(); else deck.loopBeats(4); } });
            const inBtn = btn('IN', { onClick: () => deck.loopIn(), title: 'ループの始まり（点滅中は OUT でループが決まる）' });
            loopEls = { lp, inBtn };
            parts.push(h('div', { class: 'w-row tight loop-row' },
                inBtn,
                btn('OUT', { onClick: () => deck.loopOut(), title: 'ループの終わり（ここからループ開始）' }),
                lp,
                btn('½', { onClick: () => deck.resizeLoop(0.5), title: 'ループを半分に' }),
                btn('×2', { onClick: () => deck.resizeLoop(2), title: 'ループを倍に' }),
                btn('◀ 8', { onClick: () => deck.beatJump(-32), title: '8 小節（32 拍）戻る' }),
                btn('8 ▶', { onClick: () => deck.beatJump(32), title: '8 小節（32 拍）進む' })));
        }
        const panel = h('div', { class: `dk ${side}` }, parts);
        return {
            el: panel,
            tempo,
            frame() {
                ov.draw();
                title.textContent = deck.track.title;
                bpmEl.textContent = w.showBpm ? `${fmtBpm(deck.bpm)} BPM` : '??? BPM';
                tempoPct.textContent = fmtPct(deck.tempo * deck.range);
                const p = deck.pos;
                posEl.textContent = pos2txt(p);
                const s = deck.sectionAt(p);
                const barsLeft = Math.ceil((s.end - p) / 4);
                secEl.textContent = s.label ? `${s.label}（あと ${barsLeft} 小節）` : '';
                play.classList.toggle('on', deck.playing);
                cue.classList.toggle('blink', !deck.playing && Math.abs(p - deck.cuePoint) > 0.01);
                if (sync) sync.classList.toggle('on', w.synced[deck.index] && Math.abs(deck.bpm - other.bpm) < 0.05);
                if (pads) pads.forEach((pd, i) => { pd.style.setProperty('--pad', deck.hotcues[i] === null ? '' : HOTCUE_COLORS[i]); pd.classList.toggle('set', deck.hotcues[i] !== null); });
                if (loopEls) {
                    loopEls.lp.classList.toggle('on', !!deck.loop);
                    // IN を押して OUT を待っている間は IN を点滅させる
                    loopEls.inBtn.classList.toggle('pending', deck.pendingIn !== null && deck.pendingIn !== undefined);
                }
            },
        };
    };

    // ========== ビートマッチの練習 ==========
    const beatmatch = root => {
        const mixer = new Mixer(2);
        const w = { showBpm: false, synced: [false, false] };
        const A = new Deck(mixer, 0, trackCopy('sunrise'));
        const B = new Deck(mixer, 1, trackCopy('signal'));
        const body = frameEl(root, root.dataset.title || 'ビートマッチの練習', 'DECK 2 のテンポとジョグで、DECK 1 のキックにぴったり重ねよう');
        const pA = deckPanel(w, A, B, { sync: root.dataset.sync === 'on' });
        const pB = deckPanel(w, B, A, { sync: root.dataset.sync === 'on' });
        pA.el.classList.add('locked');
        const zA = zoom(A, { beats: 8 });
        const zB = zoom(B, { beats: 8 });
        const phase = h('div', { class: 'phase' }, h('div', { class: 'phase-zero' }), h('i'));
        const result = h('p', { class: 'w-msg strong' });
        const fA = fader({ label: '1', value: 0.8, onInput: v => mixer.setFader(0, v), title: 'チャンネル 1 のフェーダー' });
        const fB = fader({ label: '2', value: 0.8, onInput: v => mixer.setFader(1, v), title: 'チャンネル 2 のフェーダー' });
        mixer.setFader(0, 0.8);
        mixer.setFader(1, 0.8);
        mixer.setTrim(0, 0.5);
        mixer.setTrim(1, 0.5);

        const newProblem = () => {
            const base = A.track.bpm;
            let bpm;
            do { bpm = 118 + Math.random() * 14; } while (Math.abs(bpm - base) < 1.5);
            B.load(trackCopy('signal', { bpm: Math.round(bpm * 10) / 10 }));
            B.setTempo(0);
            B.seek(sectionBeat(B.track, 'メイン'));
            B.cuePoint = sectionBeat(B.track, 'メイン');
            w.synced = [false, false];
            result.textContent = '';
            pB.tempo.set(0, false);
        };

        const showBpm = h('label', { class: 'w-check' }, h('input', { type: 'checkbox', onchange: e => { w.showBpm = e.target.checked; } }), 'BPM を表示する');
        const showWave = h('label', { class: 'w-check' }, h('input', { type: 'checkbox', checked: true, onchange: e => { waves.hidden = !e.target.checked; } }), '拡大波形を表示する');
        const showPhase = h('label', { class: 'w-check' }, h('input', { type: 'checkbox', onchange: e => { phase.hidden = !e.target.checked; } }), 'ずれメーターを表示する');
        phase.hidden = true;
        const waves = h('div', { class: 'zoom-pair' }, h('span', { class: 'w-label', text: 'DECK 1' }), zA.el, h('span', { class: 'w-label', text: 'DECK 2' }), zB.el);
        const check = btn('答え合わせ', { cls: 'primary', onClick: () => {
            if (!A.playing || !B.playing) { result.textContent = '両方のデッキを再生してから押してください。'; return; }
            const dBpm = B.bpm - A.bpm;
            const ms = B.phaseTo(A) * 60000 / A.bpm;
            const good = Math.abs(dBpm) < 0.15 && Math.abs(ms) < 15;
            result.className = `w-msg strong ${good ? 'good' : 'bad'}`;
            result.textContent = `${good ? 'ばっちり！' : 'もう少し。'} テンポの差 ${dBpm >= 0 ? '+' : ''}${dBpm.toFixed(2)} BPM、拍のずれ ${ms >= 0 ? '+' : ''}${ms.toFixed(0)} ms（${ms > 0 ? 'DECK 2 が先に鳴っている' : ms < 0 ? 'DECK 2 が遅れている' : 'ぴったり'}）。`;
        } });
        body.append(
            h('div', { class: 'w-row' }, btn('▶ DECK 1 を流す', { onClick: () => { if (!A.playing) { A.seek(sectionBeat(A.track, 'メイン')); A.play(); } else A.pause(); } }), check, btn('新しい問題', { onClick: newProblem })),
            h('div', { class: 'w-row' }, showBpm, showWave, showPhase),
            waves, phase, result,
            h('div', { class: 'dk-pair' }, pA.el, h('div', { class: 'mini-mixer' }, h('span', { class: 'w-label', text: '音量' }), h('div', { class: 'w-row tight' }, fA.el, fB.el)), pB.el),
            audioNote());
        newProblem();
        A.onChange = B.onChange = () => {};
        return register({
            root, mixer, decks: [A, B],
            frame() {
                pA.frame();
                pB.frame();
                if (!waves.hidden) { zA.draw(); zB.draw(); }
                if (!phase.hidden && A.playing && B.playing) phase.lastChild.style.left = `${50 + B.phaseTo(A) * 100}%`;
            },
        });
    };

    // ========== ミッション（ミックス練習の手順を自動で判定する） ==========
    const MISSIONS = {
        'first-mix': [
            { text: 'DECK 1 を再生する（ドロップから始まります）', ok: s => s.A.playing },
            { text: 'DECK 2 のチャンネルの LOW を左いっぱいまで下げておく', ok: s => s.eq(1, 'low') <= -0.9 },
            { text: 'DECK 2 の BEAT SYNC を押して、テンポを DECK 1 に合わせる', ok: s => s.w.synced[1] && Math.abs(s.B.bpm - s.A.bpm) < 0.05 },
            { text: 'DECK 1 がアウトロに入った瞬間に、DECK 2 を再生する（DECK 2 は曲の頭に CUE があります）', ok: s => s.B.playing && s.A.sectionAt(s.A.pos).label === 'アウトロ', judge: s => s.phraseCheck() },
            { text: 'DECK 2 のチャンネルフェーダーを上まで上げる', ok: s => s.fader(1) > 0.9 },
            { text: 'フレーズの頭で、DECK 1 の LOW を下げ、DECK 2 の LOW を中央まで上げる（低音の入れ替え）', ok: s => s.eq(0, 'low') <= -0.8 && s.eq(1, 'low') >= -0.1 },
            { text: 'DECK 1 のチャンネルフェーダーを下げきる', ok: s => s.fader(0) < 0.05 },
        ],
        'echo-out': [
            { text: 'DECK 1 を再生する', ok: s => s.A.playing },
            { text: 'BEAT FX の拍数を 3/4 か 1 に、FX をかけるチャンネルを 1 にする', ok: s => s.w.fxCh === 0 && s.w.fxBeats >= 0.75 },
            { text: 'BEAT FX の ON/OFF を押してエコーをかける', ok: s => s.ch(0).echo },
            { text: 'エコーをかけたまま、DECK 1 のチャンネルフェーダーを下げる（残響だけが残ります）', ok: s => s.fader(0) < 0.05 },
            { text: 'エコーを止める', ok: s => !s.ch(0).echo },
        ],
        'echo-cut': [
            { text: 'DECK 1 を再生する', ok: s => s.A.playing },
            { text: 'BEAT FX の拍数を 1 拍に、FX をかけるチャンネルを 1 にする', ok: s => s.w.fxCh === 0 && s.w.fxBeats >= 1 },
            { text: 'BEAT FX の ON/OFF を押してエコーをかける', ok: s => s.ch(0).echo },
            { text: 'エコーをかけたまま、DECK 1 のチャンネルフェーダーを下げる', ok: s => s.fader(0) < 0.05 },
            { text: '残響が鳴っているうちに DECK 2 を再生する（DECK 2 はドロップの頭に CUE があります）', ok: s => s.B.playing },
            { text: 'DECK 2 のチャンネルフェーダーを上まで上げる', ok: s => s.fader(1) > 0.9 },
            { text: 'エコーを止める', ok: s => !s.ch(0).echo },
        ],
        filter: [
            { text: 'DECK 1 を再生する', ok: s => s.A.playing },
            { text: 'DECK 1 の CFX を左に回して、こもった音（ローパス）にする', ok: s => s.ch(0).filter < -0.6 },
            { text: 'CFX を中央に戻す', ok: s => Math.abs(s.ch(0).filter) < 0.05 },
            { text: 'こんどは右に回して、低音が抜けた音（ハイパス）にする', ok: s => s.ch(0).filter > 0.6 },
            { text: 'CFX を中央に戻す', ok: s => Math.abs(s.ch(0).filter) < 0.05 },
        ],
        loop: [
            { text: 'DECK 1 を再生する（アウトロの手前から始まります）', ok: s => s.A.playing },
            { text: 'アウトロに入ったら 4 BEAT を押してループする', ok: s => !!s.A.loop && s.A.sectionAt(s.A.pos).label === 'アウトロ' },
            { text: '×2 を 2 回押して、16 拍（4 小節）のループにする', ok: s => s.A.loop && s.A.loop.end - s.A.loop.start === 16 },
            { text: 'もう一度 4 BEAT を押して、ループを抜ける', ok: s => !s.A.loop },
        ],
        monitor: [
            { text: 'DECK 1 を再生する。スピーカーから流れているのが DECK 1 です', ok: s => s.A.playing },
            { text: 'DECK 2 のチャンネルフェーダーが下がっていることを確かめて、DECK 2 を再生する', ok: s => s.B.playing && s.fader(1) < 0.05 },
            { text: 'チャンネル 2 のヘッドホン CUE ボタンを押す', ok: s => s.ch(1).cue },
            { text: '「聴く場所」をヘッドホンにする。DECK 2 が聞こえるはずです', ok: s => s.mixer.monitor === 'phones' },
            { text: 'HEADPHONES MIX を右に回して、DECK 1（マスター）も混ぜて聴く', ok: s => s.mixer.phonesMix > 0.4 },
            { text: '「聴く場所」をスピーカーに戻す。お客さんには DECK 1 しか聞こえていません', ok: s => s.mixer.monitor === 'speakers' },
        ],
    };

    // ========== 2 デッキのミックス練習 ==========
    const mixerWidget = root => {
        const features = (root.dataset.features || 'eq sync').split(/\s+/);
        const has = f => features.includes(f);
        const mixer = new Mixer(2);
        const w = { showBpm: true, synced: [false, false], fxCh: 0, fxBeats: 0.5 };
        const parse = (spec, fallback) => {
            const [id, at] = (spec || fallback).split('@');
            return { id, at };
        };
        const a = parse(root.dataset.a, 'sunrise');
        const b = parse(root.dataset.b, 'signal');
        const A = new Deck(mixer, 0, trackCopy(a.id));
        const B = new Deck(mixer, 1, trackCopy(b.id));
        [[A, a], [B, b]].forEach(([d, spec]) => { const s = sectionBeat(d.track, spec.at); d.seek(s); d.cuePoint = s; });
        const body = frameEl(root, root.dataset.title || '2 デッキでミックスする', 'つまみは上下にドラッグ。フェーダーはドラッグかクリック');

        const pA = deckPanel(w, A, B, { sync: has('sync'), pads: has('pads'), loop: has('loop') });
        const pB = deckPanel(w, B, A, { sync: has('sync'), pads: has('pads'), loop: has('loop') });

        // ---- ミキサー部 ----
        const ctl = { 0: {}, 1: {} };
        const meters = [meter(), meter()];
        const column = i => {
            const col = h('div', { class: 'mx-ch' });
            ctl[i].trim = knob({ label: 'TRIM', value: 0.5, min: 0, max: 1, def: 0.5, onInput: v => mixer.setTrim(i, v) });
            col.append(ctl[i].trim.el);
            if (has('eq')) ['high', 'mid', 'low'].forEach(band => {
                ctl[i][band] = knob({ label: band === 'high' ? 'HI' : band.toUpperCase(), value: 0, onInput: v => mixer.setEq(i, band, v) });
                col.append(ctl[i][band].el);
            });
            if (has('filter')) { ctl[i].filter = knob({ label: 'CFX', value: 0, cls: 'cfx', onInput: v => mixer.setFilter(i, v) }); col.append(ctl[i].filter.el); }
            if (has('phones')) {
                ctl[i].cue = btn('<span aria-hidden="true">🎧</span> CUE', { cls: 'chcue', pressed: false, title: `チャンネル ${i + 1} をヘッドホンで聴く`, onClick: () => { mixer.setCue(i, !mixer.ch[i].state.cue); ctl[i].cue.setAttribute('aria-pressed', String(mixer.ch[i].state.cue)); } });
                col.append(ctl[i].cue);
            }
            ctl[i].fader = fader({ label: `CH ${i + 1}`, value: Number(root.dataset[`fader${i + 1}`] ?? (i === 0 ? 1 : 0)), onInput: v => mixer.setFader(i, v) });
            ctl[i].faderInit = ctl[i].fader.value;
            mixer.setFader(i, ctl[i].fader.value);
            col.append(h('div', { class: 'ch-fader' }, meters[i].el, ctl[i].fader.el));
            return col;
        };
        const xf = fader({ label: 'クロスフェーダー', value: 0.5, def: 0.5, vertical: false, center: true, cls: 'xfader', onInput: v => mixer.setXfader(v) });
        const master = knob({ label: 'MASTER', value: 0.75, min: 0, max: 1, def: 0.75, onInput: v => mixer.setMasterLevel(v) });
        const clip = h('span', { class: 'w-clip', text: '音割れ' });
        const mid = h('div', { class: 'mx-center' }, master.el, clip);
        // やり直しのときに初期状態へ戻すための部品
        let pmix = null;
        let monInputs = [];
        let fx = null;
        if (has('phones')) {
            pmix = knob({ label: 'PHONES MIX', value: 0, min: 0, max: 1, title: 'HEADPHONES MIX：左で CUE、右でマスター', onInput: v => mixer.setPhonesMix(v) });
            const mon = h('div', { class: 'monitor', role: 'radiogroup', 'aria-label': '聴く場所' },
                h('span', { class: 'w-label', text: '聴く場所' }),
                ...[['speakers', 'スピーカー'], ['phones', 'ヘッドホン']].map(([v, t]) => h('label', {}, h('input', { type: 'radio', name: `mon-${Math.random().toString(36).slice(2)}`, value: v, checked: v === 'speakers', onchange: () => mixer.setMonitor(v) }), t)));
            monInputs = [...mon.querySelectorAll('input')];
            mid.append(pmix.el, mon);
        }
        if (has('fx')) {
            const beatsSel = h('select', { class: 'w-select', 'aria-label': 'エコーの拍数', onchange: e => { w.fxBeats = Number(e.target.value); [0, 1].forEach(i => mixer.setEcho(i, { beats: w.fxBeats })); } },
                ...[['0.25', '1/4'], ['0.5', '1/2'], ['0.75', '3/4'], ['1', '1'], ['2', '2']].map(([v, t]) => h('option', { value: v, text: `${t} 拍`, selected: v === '0.5' })));
            const chSel = h('select', { class: 'w-select', 'aria-label': 'エフェクトをかけるチャンネル', onchange: e => {
                const was = mixer.ch[w.fxCh].state.echo;
                mixer.setEcho(w.fxCh, { on: false });
                w.fxCh = Number(e.target.value);
                mixer.setEcho(w.fxCh, { on: was });
            } }, h('option', { value: '0', text: 'CH 1' }), h('option', { value: '1', text: 'CH 2' }));
            const depth = knob({ label: 'DEPTH', value: 0.5, min: 0, max: 1, def: 0.5, onInput: v => [0, 1].forEach(i => mixer.setEcho(i, { depth: v })) });
            const on = btn('ON/OFF', { cls: 'fxon', pressed: false, onClick: () => {
                const st = !mixer.ch[w.fxCh].state.echo;
                mixer.setEcho(w.fxCh, { on: st, beats: w.fxBeats });
                on.setAttribute('aria-pressed', String(st));
            } });
            fx = { beatsSel, chSel, depth, on };
            mid.append(h('div', { class: 'fx-box' }, h('span', { class: 'w-label', text: 'BEAT FX（ECHO）' }), beatsSel, chSel, depth.el, on));
        }
        const mixerEl = h('div', { class: 'mx' }, h('div', { class: 'mx-cols' }, column(0), mid, column(1)), xf.el);

        // ---- ミッション ----
        let missionEl = null;
        let missionCount = null;
        const steps = MISSIONS[root.dataset.mission] || null;
        let stepIdx = 0;
        let judgeMsg = '';
        const phraseCheck = () => {
            // DECK 1 のフレーズの中の位置と、DECK 2 のフレーズの中の位置がそろっているか
            const pa = ((A.pos % 32) + 32) % 32;
            const pb = ((B.pos % 32) + 32) % 32;
            let d = pa - pb;
            if (d > 16) d -= 32;
            if (d < -16) d += 32;
            return Math.abs(d) < 1
                ? 'フレーズの頭がそろいました。'
                : `フレーズが ${Math.abs(d).toFixed(1)} 拍ずれています（${d > 0 ? '再生が遅かった' : '再生が早かった'}）。CUE を押して DECK 2 を頭に戻し、次のフレーズの頭でやり直しても OK。`;
        };
        const S = {
            A, B, mixer, w, phraseCheck,
            eq: (i, band) => mixer.ch[i].state.eq[band],
            fader: i => mixer.ch[i].state.fader,
            ch: i => mixer.ch[i].state,
        };
        if (steps) {
            missionEl = h('ol', { class: 'mission' }, steps.map(s => h('li', { text: s.text })));
            missionCount = h('span', { class: 'mission-count' });
            // 狭い画面では今の手順だけを出す。「すべての手順」で全部を開く
            const all = btn('すべての手順', { cls: 'mission-all', pressed: false, onClick: () => {
                const open = !missionBox.classList.contains('open');
                missionBox.classList.toggle('open', open);
                all.setAttribute('aria-pressed', String(open));
            } });
            const missionBox = h('div', { class: 'mission-box' }, h('div', { class: 'w-row' }, h('span', { class: 'w-label', text: 'ミッション' }), missionCount, btn('最初からやり直す', { onClick: () => reset() }), all), missionEl, h('p', { class: 'w-msg mission-msg' }));
            body.append(missionBox);
        }
        const reset = () => {
            [[A, a], [B, b]].forEach(([d, spec]) => { d.pause(); d.exitLoop(); d.setTempo(0); d.setNudge(0); d.syncWith = null; const s = sectionBeat(d.track, spec.at); d.seek(s); d.cuePoint = s; });
            [0, 1].forEach(i => {
                ['high', 'mid', 'low'].forEach(band => { if (ctl[i][band]) ctl[i][band].set(0); });
                if (ctl[i].filter) ctl[i].filter.set(0);
                ctl[i].trim.set(0.5);
                ctl[i].fader.set(ctl[i].faderInit);
                mixer.setEcho(i, { on: false });
                if (ctl[i].cue) { mixer.setCue(i, false); ctl[i].cue.setAttribute('aria-pressed', 'false'); }
            });
            xf.set(0.5);
            master.set(0.75);
            pA.tempo.set(0, false);
            pB.tempo.set(0, false);
            if (pmix) pmix.set(0);
            if (monInputs.length) { monInputs.forEach(x => { x.checked = x.value === 'speakers'; }); mixer.setMonitor('speakers'); }
            if (fx) {
                fx.beatsSel.value = '0.5';
                fx.chSel.value = '0';
                w.fxBeats = 0.5;
                w.fxCh = 0;
                fx.depth.set(0.5);
                [0, 1].forEach(i => mixer.setEcho(i, { on: false, beats: w.fxBeats }));
                fx.on.setAttribute('aria-pressed', 'false');
            }
            w.synced = [false, false];
            stepIdx = 0;
            judgeMsg = '';
        };

        body.append(h('div', { class: 'dk-pair' }, pA.el, mixerEl, pB.el), audioNote());
        return register({
            root, mixer, decks: [A, B], get step() { return stepIdx; },
            frame() {
                pA.frame();
                pB.frame();
                const lv = mixer.levels();
                meters[0].set(lv.ch[0]);
                meters[1].set(lv.ch[1]);
                clip.classList.toggle('on', lv.clip);
                if (steps) {
                    while (stepIdx < steps.length && steps[stepIdx].ok(S)) {
                        if (steps[stepIdx].judge) judgeMsg = steps[stepIdx].judge(S);
                        stepIdx++;
                    }
                    [...missionEl.children].forEach((li, i) => { li.classList.toggle('done', i < stepIdx); li.classList.toggle('now', i === stepIdx); });
                    missionCount.textContent = stepIdx >= steps.length ? '完了' : `${stepIdx + 1} / ${steps.length}`;
                    const m = body.querySelector('.mission-msg');
                    m.textContent = stepIdx >= steps.length ? `ミッション完了！ ${judgeMsg}` : judgeMsg;
                }
            },
        });
    };

    // ========== キーの相性（Camelot ホイール） ==========
    const CAMELOT = {
        '1A': ['A♭m', 'G#3'], '2A': ['E♭m', 'D#3'], '3A': ['B♭m', 'A#3'], '4A': ['Fm', 'F3'], '5A': ['Cm', 'C3'], '6A': ['Gm', 'G3'],
        '7A': ['Dm', 'D3'], '8A': ['Am', 'A3'], '9A': ['Em', 'E3'], '10A': ['Bm', 'B3'], '11A': ['F#m', 'F#3'], '12A': ['D♭m', 'C#3'],
        '1B': ['B', 'B3'], '2B': ['F#', 'F#3'], '3B': ['D♭', 'C#3'], '4B': ['A♭', 'G#3'], '5B': ['E♭', 'D#3'], '6B': ['B♭', 'A#3'],
        '7B': ['F', 'F3'], '8B': ['C', 'C3'], '9B': ['G', 'G3'], '10B': ['D', 'D3'], '11B': ['A', 'A3'], '12B': ['E', 'E3'],
    };
    const chordOf = code => {
        const [, rootName] = CAMELOT[code];
        const r = DJAudio.n(rootName.replace('♭', 'b'));
        const minor = code.endsWith('A');
        return [r, r + (minor ? 3 : 4), r + 7, r + 12];
    };
    const relation = (a, b) => {
        if (a === b) return '同じキー';
        const na = parseInt(a, 10), nb = parseInt(b, 10);
        const la = a.slice(-1), lb = b.slice(-1);
        const diff = ((nb - na) % 12 + 12) % 12;
        if (na === nb) return la === 'A' ? '平行調（同じ番号のメジャー）' : '平行調（同じ番号のマイナー）';
        if (la === lb && diff === 1) return '番号が 1 つ上（なめらか）';
        if (la === lb && diff === 11) return '番号が 1 つ下（なめらか）';
        return null;
    };
    const keyWheel = root => {
        const body = frameEl(root, 'キーの相性（Camelot ホイール）', 'キーをクリック。2 つ選ぶと和音を重ねて聴けます');
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '-160 -160 320 320');
        svg.setAttribute('class', 'kw');
        let picked = [];
        const cells = {};
        const arc = (r0, r1, a0, a1) => {
            const p = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
            return `M${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
        };
        Object.keys(CAMELOT).forEach(code => {
            const num = parseInt(code, 10);
            const minor = code.endsWith('A');
            const a0 = ((num % 12) - 0.5) / 12 * Math.PI * 2;  // 12 を真上にする
            const a1 = a0 + Math.PI * 2 / 12;
            const [r0, r1] = minor ? [62, 108] : [110, 156];
            const g = document.createElementNS(NS, 'g');
            g.setAttribute('class', `kw-cell ${minor ? 'minor' : 'major'}`);
            g.setAttribute('tabindex', '0');
            g.setAttribute('role', 'button');
            g.setAttribute('aria-label', `${code}（${CAMELOT[code][0]}）`);
            const path = document.createElementNS(NS, 'path');
            path.setAttribute('d', arc(r0, r1, a0, a1));
            const am = (a0 + a1) / 2;
            const rm = (r0 + r1) / 2;
            const t1 = document.createElementNS(NS, 'text');
            t1.setAttribute('x', (rm * Math.sin(am)).toFixed(1));
            t1.setAttribute('y', (-rm * Math.cos(am) - 3).toFixed(1));
            t1.textContent = code;
            const t2 = document.createElementNS(NS, 'text');
            t2.setAttribute('x', (rm * Math.sin(am)).toFixed(1));
            t2.setAttribute('y', (-rm * Math.cos(am) + 11).toFixed(1));
            t2.setAttribute('class', 'sub');
            t2.textContent = CAMELOT[code][0];
            g.append(path, t1, t2);
            const choose = () => {
                // 同じキーを 2 回選ぶのもあり（同じキー同士を重ねる）。2 つ選び終えたあとの 3 回目で選び直し
                if (picked.length >= 2) picked = [];
                picked.push(code);
                paint();
                const notes = picked.length === 2 ? [...chordOf(picked[0]), ...chordOf(picked[1]).map(x => x + 12)] : chordOf(code);
                DJAudio.claim({ stopAll() {} });
                DJAudio.playChord(notes, 2.2);
            };
            g.addEventListener('click', choose);
            g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
            cells[code] = g;
            svg.append(g);
        });
        const center = document.createElementNS(NS, 'text');
        center.setAttribute('class', 'kw-center');
        center.setAttribute('y', '4');
        svg.append(center);
        const msg = h('p', { class: 'w-msg' });
        const paint = () => {
            const base = picked[0];
            Object.entries(cells).forEach(([code, g]) => {
                g.classList.toggle('picked', picked.includes(code));
                g.classList.toggle('good', !!base && !!relation(base, code) && code !== base);
                g.classList.toggle('dim', !!base && !relation(base, code) && !picked.includes(code));
            });
            center.textContent = base ? `${base} = ${CAMELOT[base][0]}` : 'キーを選ぶ';
            if (picked.length === 2) {
                const r = relation(picked[0], picked[1]);
                msg.className = `w-msg strong ${r ? 'good' : 'bad'}`;
                msg.textContent = r
                    ? `${picked[0]} → ${picked[1]}：${r}。重ねてもぶつかりにくい組み合わせです。`
                    : `${picked[0]} → ${picked[1]}：ホイール上で離れています。重ねると響きがにごりやすい組み合わせです。`;
            } else if (base) {
                msg.className = 'w-msg';
                msg.textContent = `${base}（${CAMELOT[base][0]}）と相性がよいのは、緑色の 3 つです。もう 1 つクリックすると、2 つの和音を重ねて聴けます。`;
            } else msg.textContent = '';
        };
        body.append(h('div', { class: 'kw-wrap' }, svg), msg, h('p', { class: 'w-note', text: '外側がメジャーキー（B）、内側がマイナーキー（A）。音が出ます。' }));
        paint();
        return register({ root, frame() {} });
    };

    const TYPES = { metronome, 'tap-bpm': tapBpm, structure, channel, 'cue-deck': cueDeck, beatmatch, mixer: mixerWidget, 'key-wheel': keyWheel };

    const init = () => {
        document.querySelectorAll('[data-widget]').forEach(root => {
            const make = TYPES[root.dataset.widget];
            if (!make) { console.warn('知らないウィジェット:', root.dataset.widget); return; }
            try {
                make(root);
            } catch (e) {
                console.error(e);
                root.textContent = 'この練習ツールを表示できませんでした。';
            }
        });
    };

    // 最初のクリックで音を出せるようにする（ブラウザの自動再生の制限のため）
    // iOS では pointerdown だけでは再開できないことがあるので、click と touchend でも試す
    ['pointerdown', 'click', 'touchend'].forEach(type => document.addEventListener(type, () => { if (!DJAudio.running) DJAudio.ensure(); }, { capture: true, passive: true }));
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    return { MISSIONS };
})();
