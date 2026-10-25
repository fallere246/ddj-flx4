/*
 * 練習用の音のエンジン（Web Audio）。
 * 曲は音源ファイルを使わず、その場でドラム・ベース・コードを合成して鳴らす。
 *
 *   TRACKS        練習用の曲（8 小節ごとのブロックで構成を書く）
 *   DJAudio.Mixer チャンネル（TRIM → EQ → CFX → フェーダー → クロスフェーダー）とマスター、ヘッドホン
 *   DJAudio.Deck  1 曲を再生するデッキ（再生位置は拍で持つ。CUE・ホットキュー・ループ・テンポ）
 */
const DJAudio = (() => {
    let ctx = null;
    let noise = null;
    let owner = null;

    const ensure = () => {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        // iOS では 'interrupted' になることもあるので、running 以外ならすべて再開を試す
        if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume();
        return ctx;
    };

    // ページ内で同時に鳴らすのは 1 つのウィジェットだけにする
    const claim = who => {
        if (owner && owner !== who) owner.stopAll();
        owner = who;
    };

    const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
    const dbGain = db => Math.pow(10, db / 20);
    const gainDb = g => (g > 0 ? 20 * Math.log10(g) : -Infinity);

    // ========== 楽器 ==========
    // それぞれ (出力先, 開始時刻, 1 拍の秒数, パラメーター) を受け取り、止めるためのノードを返す
    const env = (g, t, peak, attack, decay) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };

    const noiseSrc = t => {
        const s = ctx.createBufferSource();
        s.buffer = noise;
        s.loop = true;
        s.loopStart = Math.random() * 0.5;
        return s;
    };

    const INSTR = {
        kick(dest, t, beat, p) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.setValueAtTime(160, t);
            o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
            env(g, t, 0.95 * (p.v || 1), 0.002, 0.42);
            o.connect(g).connect(dest);
            o.start(t);
            o.stop(t + 0.5);
            return [o];
        },
        hat(dest, t, beat, p) {
            const s = noiseSrc();
            const f = ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = 7500;
            const g = ctx.createGain();
            env(g, t, 0.16 * (p.v || 1), 0.001, p.open ? 0.22 : 0.045);
            s.connect(f).connect(g).connect(dest);
            s.start(t);
            s.stop(t + 0.3);
            return [s];
        },
        clap(dest, t, beat, p) {
            const s = noiseSrc();
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 1600;
            f.Q.value = 0.9;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            [0, 0.012, 0.024].forEach(dt => {
                g.gain.setValueAtTime(0.42 * (p.v || 1), t + dt);
                g.gain.exponentialRampToValueAtTime(0.05, t + dt + 0.01);
            });
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
            s.connect(f).connect(g).connect(dest);
            s.start(t);
            s.stop(t + 0.25);
            return [s];
        },
        crash(dest, t) {
            const s = noiseSrc();
            const f = ctx.createBiquadFilter();
            f.type = 'highpass';
            f.frequency.value = 4500;
            const g = ctx.createGain();
            env(g, t, 0.14, 0.003, 1.6);
            s.connect(f).connect(g).connect(dest);
            s.start(t);
            s.stop(t + 1.7);
            return [s];
        },
        bass(dest, t, beat, p) {
            const dur = p.d * beat;
            const o = ctx.createOscillator();
            const sub = ctx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = midiHz(p.n);
            sub.frequency.value = midiHz(p.n);
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.Q.value = 6;
            f.frequency.setValueAtTime(900, t);
            f.frequency.exponentialRampToValueAtTime(180, t + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.26, t + 0.006);
            g.gain.setValueAtTime(0.26, t + dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            const sg = ctx.createGain();
            sg.gain.value = 0.9;
            o.connect(f).connect(g);
            sub.connect(sg).connect(g);
            g.connect(dest);
            [o, sub].forEach(x => { x.start(t); x.stop(t + dur + 0.02); });
            return [o, sub];
        },
        // うなるベース（ダブステップ風）：フィルターを拍に合わせて開け閉めする
        wobble(dest, t, beat, p) {
            const dur = p.d * beat;
            const o = ctx.createOscillator();
            const sub = ctx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = midiHz(p.n);
            sub.frequency.value = midiHz(p.n);
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.Q.value = 8;
            const rate = p.rate || 0.5;   // 開け閉めの間隔（拍）
            f.frequency.setValueAtTime(150, t);
            for (let x = 0; x < dur; x += rate * beat) {
                f.frequency.exponentialRampToValueAtTime(1600, t + x + rate * beat * 0.45);
                f.frequency.exponentialRampToValueAtTime(150, t + Math.min(dur, x + rate * beat));
            }
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.24, t + 0.01);
            g.gain.setValueAtTime(0.24, t + dur * 0.9);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            const sg = ctx.createGain();
            sg.gain.value = 0.8;
            o.connect(f).connect(g);
            sub.connect(sg).connect(g);
            g.connect(dest);
            [o, sub].forEach(x => { x.start(t); x.stop(t + dur + 0.02); });
            return [o, sub];
        },
        chord(dest, t, beat, p) {
            // p.ns: 音の高さ（MIDI）、p.d: 長さ（拍）、p.pad: ゆっくり立ち上がる持続音
            const dur = p.d * beat;
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = p.pad ? 1400 : 2600;
            const g = ctx.createGain();
            const peak = (p.pad ? 0.075 : 0.085) * (p.v || 1);
            const attack = p.pad ? Math.min(0.6, dur * 0.3) : 0.004;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(peak, t + attack);
            g.gain.setValueAtTime(peak, t + Math.max(attack, dur * 0.8));
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (p.pad ? 0.4 : 0.05));
            f.connect(g).connect(dest);
            const nodes = [];
            p.ns.forEach(n => [-7, 7].forEach(cents => {
                const o = ctx.createOscillator();
                o.type = 'sawtooth';
                o.frequency.value = midiHz(n);
                o.detune.value = cents;
                o.connect(f);
                o.start(t);
                o.stop(t + dur + 0.5);
                nodes.push(o);
            }));
            return nodes;
        },
        pluck(dest, t, beat, p) {
            const o = ctx.createOscillator();
            o.type = 'square';
            o.frequency.value = midiHz(p.n);
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.setValueAtTime(3200, t);
            f.frequency.exponentialRampToValueAtTime(500, t + 0.18);
            const g = ctx.createGain();
            env(g, t, 0.07 * (p.v || 1), 0.002, 0.2);
            o.connect(f).connect(g).connect(dest);
            o.start(t);
            o.stop(t + 0.25);
            return [o];
        },
        snare(dest, t, beat, p) {
            const s = noiseSrc();
            const f = ctx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 2200;
            f.Q.value = 0.6;
            const g = ctx.createGain();
            env(g, t, 0.3 * (p.v || 1), 0.001, 0.09);
            s.connect(f).connect(g).connect(dest);
            s.start(t);
            s.stop(t + 0.15);
            return [s];
        },
        click(dest, t, beat, p) {
            const o = ctx.createOscillator();
            o.frequency.value = p.accent ? 1760 : 1320;
            const g = ctx.createGain();
            env(g, t, 0.3, 0.001, 0.05);
            o.connect(g).connect(dest);
            o.start(t);
            o.stop(t + 0.08);
            return [o];
        },
    };

    // ========== 曲のパート ==========
    // 16 分音符 1 つぶん（step: 小節内 0〜15）ごとに、鳴らす音を返す。
    // ctx: { bar: ブロック内の小節 (0〜7), chord: [ルート, ...構成音], block }
    const PARTS = {
        click: s => (s % 4 === 0 ? [{ i: 'click', accent: s === 0 }] : []),
        kick: s => (s % 4 === 0 ? [{ i: 'kick' }] : []),
        hat: s => (s % 4 === 2 ? [{ i: 'hat' }] : []),
        hat16: s => [{ i: 'hat', v: s % 4 === 2 ? 1 : 0.45, open: s % 4 === 2 }],
        clap: s => (s === 4 || s === 12 ? [{ i: 'clap' }] : []),
        bass: (s, c) => (s % 4 === 2 ? [{ i: 'bass', n: c.chord[0], d: 0.42 }] : []),
        rollbass: (s, c) => (s % 4 !== 0 ? [{ i: 'bass', n: c.chord[0] + (s % 4 === 3 ? 12 : 0), d: 0.2 }] : []),
        stab: (s, c) => (s === 3 || s === 10 ? [{ i: 'chord', ns: c.chord.slice(1), d: 0.35 }] : []),
        pad: (s, c) => (s === 0 ? [{ i: 'chord', ns: c.chord.slice(1), d: 4, pad: true }] : []),
        arp: (s, c) => (s % 2 === 0 ? [{ i: 'pluck', n: c.chord[1 + (s / 2) % 3] + 12, v: s % 4 === 0 ? 1 : 0.6 }] : []),
        // ビルドアップ：8 小節でだんだん細かくなるスネアロール
        roll: (s, c) => {
            const div = c.bar < 4 ? 4 : c.bar < 6 ? 2 : 1;
            return s % div === 0 ? [{ i: 'snare', v: 0.35 + 0.65 * ((c.bar * 16 + s) / 128) }] : [];
        },
        // 半テン（ハーフタイム）：キックは小節の頭、スネアは 3 拍目だけ。BPM の半分の速さに聞こえる
        halfkick: s => (s === 0 || s === 10 ? [{ i: 'kick' }] : []),
        halfsnare: s => (s === 8 ? [{ i: 'snare', v: 1 }, { i: 'clap' }] : []),
        wob: (s, c) => (s === 0 ? [{ i: 'wobble', n: c.chord[0], d: 3.5, rate: c.bar % 2 ? 0.25 : 0.5 }] : []),
        // ブロックの頭のシンバル
        crash: (s, c) => (c.bar === 0 && s === 0 ? [{ i: 'crash' }] : []),
    };

    // 波形表示用：パートごとの低・中・高音のおおよその量
    const BAND = {
        click: [0, 0.5, 0.3], kick: [1, 0.15, 0], hat: [0, 0.05, 0.45], hat16: [0, 0.05, 0.35], clap: [0, 0.55, 0.3],
        bass: [0.55, 0.25, 0], rollbass: [0.5, 0.25, 0], stab: [0.05, 0.5, 0.2], pad: [0.05, 0.3, 0.05],
        arp: [0, 0.3, 0.25], roll: [0, 0.4, 0.35], crash: [0, 0.1, 0.7],
        halfkick: [0.8, 0.1, 0], halfsnare: [0, 0.6, 0.4], wob: [0.6, 0.4, 0.1],
    };

    // ========== 練習用の曲 ==========
    // prog: 1 小節ごとのコード [ベースの音, コードの構成音...]（4 小節でくり返す）
    // blocks: 8 小節ごとの構成。label が同じブロックは画面上でひとまとまりに表示する
    const n = name => {
        const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
        return 12 * (Number(m[3]) + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    };
    const chord = (bass, ...tones) => [n(bass), ...tones.map(n)];

    const TRACKS = {
        sunrise: {
            title: 'Sunrise Drive', bpm: 124, key: 'Am', camelot: '8A', level: -7,
            prog: [chord('A1', 'A3', 'C4', 'E4'), chord('F1', 'F3', 'A3', 'C4'), chord('C2', 'G3', 'C4', 'E4'), chord('G1', 'G3', 'B3', 'D4')],
            blocks: [
                { label: 'イントロ', parts: ['kick'] },
                { label: 'イントロ', parts: ['kick', 'hat'] },
                { label: 'メイン', parts: ['kick', 'hat', 'clap', 'bass', 'crash'] },
                { label: 'メイン', parts: ['kick', 'hat', 'clap', 'bass', 'stab', 'crash'] },
                { label: 'ブレイク', parts: ['pad', 'crash'] },
                { label: 'ブレイク', parts: ['pad', 'arp'] },
                { label: 'ビルドアップ', parts: ['pad', 'arp', 'roll'] },
                { label: 'ドロップ', parts: ['kick', 'hat16', 'clap', 'bass', 'stab', 'arp', 'crash'] },
                { label: 'ドロップ', parts: ['kick', 'hat16', 'clap', 'bass', 'stab', 'arp', 'crash'] },
                { label: 'アウトロ', parts: ['kick', 'hat', 'clap', 'bass', 'crash'] },
                { label: 'アウトロ', parts: ['kick', 'hat'] },
                { label: 'アウトロ', parts: ['kick'] },
            ],
        },
        signal: {
            title: 'Night Signal', bpm: 127, key: 'Dm', camelot: '7A', level: -4,
            prog: [chord('D2', 'D4', 'F4', 'A4'), chord('Bb1', 'D4', 'F4', 'Bb4'), chord('F1', 'C4', 'F4', 'A4'), chord('C2', 'C4', 'E4', 'G4')],
            blocks: [
                { label: 'イントロ', parts: ['kick', 'hat'] },
                { label: 'イントロ', parts: ['kick', 'hat16'] },
                { label: 'メイン', parts: ['kick', 'hat16', 'clap', 'rollbass', 'crash'] },
                { label: 'メイン', parts: ['kick', 'hat16', 'clap', 'rollbass', 'arp', 'crash'] },
                { label: 'ブレイク', parts: ['pad', 'arp', 'crash'] },
                { label: 'ビルドアップ', parts: ['pad', 'roll'] },
                { label: 'ドロップ', parts: ['kick', 'hat16', 'clap', 'rollbass', 'stab', 'crash'] },
                { label: 'ドロップ', parts: ['kick', 'hat16', 'clap', 'rollbass', 'stab', 'arp', 'crash'] },
                { label: 'アウトロ', parts: ['kick', 'hat16', 'clap', 'crash'] },
                { label: 'アウトロ', parts: ['kick', 'hat'] },
            ],
        },
        tide: {
            title: 'Low Tide', bpm: 120, key: 'F#m', camelot: '11A', level: -5,
            prog: [chord('F#1', 'F#3', 'A3', 'C#4'), chord('D2', 'F#3', 'A3', 'D4'), chord('A1', 'E3', 'A3', 'C#4'), chord('E2', 'E3', 'G#3', 'B3')],
            blocks: [
                { label: 'イントロ', parts: ['kick', 'hat'] },
                { label: 'メイン', parts: ['kick', 'hat', 'clap', 'bass', 'crash'] },
                { label: 'メイン', parts: ['kick', 'hat', 'clap', 'bass', 'pad'] },
                { label: 'ブレイク', parts: ['pad', 'arp', 'crash'] },
                { label: 'ドロップ', parts: ['kick', 'hat16', 'clap', 'bass', 'stab', 'crash'] },
                { label: 'アウトロ', parts: ['kick', 'hat', 'crash'] },
            ],
        },
        // 140 BPM で、ドロップが半テン（ダブステップ風）。テンポの違う曲をつなぐ練習用
        rift: {
            title: 'Glass Rift', bpm: 140, key: 'Bm', camelot: '10A', level: -5,
            prog: [chord('B1', 'B3', 'D4', 'F#4'), chord('B1', 'B3', 'D4', 'F#4'), chord('G1', 'G3', 'B3', 'D4'), chord('F#1', 'F#3', 'A#3', 'C#4')],
            blocks: [
                { label: 'イントロ', parts: ['kick', 'hat'] },
                { label: 'ビルドアップ', parts: ['pad', 'roll'] },
                { label: 'ドロップ', parts: ['halfkick', 'halfsnare', 'hat16', 'wob', 'crash'] },
                { label: 'ドロップ', parts: ['halfkick', 'halfsnare', 'hat16', 'wob', 'stab', 'crash'] },
                { label: 'ブレイク', parts: ['pad', 'arp', 'crash'] },
                { label: 'ドロップ', parts: ['halfkick', 'halfsnare', 'hat16', 'wob', 'stab', 'crash'] },
                { label: 'アウトロ', parts: ['halfkick', 'halfsnare', 'hat'] },
            ],
        },
        // メトロノーム（拍と小節を数える練習用）
        metronome: {
            title: 'メトロノーム', bpm: 120, key: '', camelot: '', level: -4, loopAll: true,
            prog: [chord('A1', 'A3')],
            blocks: [{ label: '', parts: ['click'] }],
        },
        // 4 つ打ちのドラムだけ（拍とテンポの確認用）
        beat: {
            title: 'ドラムだけ', bpm: 124, key: '', camelot: '', level: -6, loopAll: true,
            prog: [chord('A1', 'A3')],
            blocks: [{ label: '', parts: ['kick', 'hat', 'clap'] }],
        },
        // 半テンのドラムだけ（4 つ打ちと聴き比べる用）
        halfbeat: {
            title: 'ドラムだけ（半テン）', bpm: 140, key: '', camelot: '', level: -6, loopAll: true,
            prog: [chord('A1', 'A3')],
            blocks: [{ label: '', parts: ['halfkick', 'hat16', 'halfsnare'] }],
        },
    };

    // 曲の総拍数と、ブロックのまとまり（セクション）を計算しておく
    Object.entries(TRACKS).forEach(([id, t]) => {
        t.id = id;
        t.beats = t.blocks.length * 32;
        t.sections = [];
        t.blocks.forEach((b, i) => {
            const last = t.sections[t.sections.length - 1];
            if (last && last.label === b.label) last.end += 32;
            else t.sections.push({ label: b.label, start: i * 32, end: i * 32 + 32 });
        });
    });

    // ある 16 分音符で鳴る音
    const eventsAt = (track, step) => {
        const block = track.blocks[Math.floor(step / 128) % track.blocks.length];
        const barAll = Math.floor(step / 16);
        const c = { bar: barAll % 8, chord: track.prog[barAll % track.prog.length], block };
        const s = step % 16;
        return block.parts.flatMap(p => PARTS[p](s, c));
    };

    // 波形表示用：16 分音符ごとの [低, 中, 高]
    const waveformOf = track => {
        if (track.wave) return track.wave;
        const steps = track.beats * 4;
        const wave = new Array(steps);
        let crashLeft = 0;
        let padOn = 0;
        for (let st = 0; st < steps; st++) {
            const block = track.blocks[Math.floor(st / 128)];
            const s = st % 16;
            const c = { bar: Math.floor(st / 16) % 8, chord: [0, 0, 0, 0], block };
            const v = [0, 0, 0];
            block.parts.forEach(p => {
                const hit = PARTS[p](s, c).length > 0;
                if (p === 'crash') { if (hit) crashLeft = 12; return; }
                if (p === 'pad') { if (hit) padOn = 16; return; }
                if (hit) BAND[p].forEach((x, k) => { v[k] += x; });
            });
            if (padOn > 0) { BAND.pad.forEach((x, k) => { v[k] += x; }); padOn--; }
            if (crashLeft > 0) { v[2] += 0.06 * crashLeft; crashLeft--; }
            wave[st] = v.map(x => Math.min(1, x));
        }
        track.wave = wave;
        return wave;
    };

    // ========== ミキサー ==========
    class Mixer {
        constructor(channels = 2) {
            ensure();
            this.decks = [];
            this.out = ctx.createGain();
            this.limiter = ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -2;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.002;
            this.limiter.release.value = 0.15;
            this.out.connect(this.limiter).connect(ctx.destination);

            this.masterBus = ctx.createGain();
            this.master = ctx.createGain();
            this.masterMeter = ctx.createAnalyser();
            this.masterMeter.fftSize = 1024;
            this.masterBus.connect(this.master).connect(this.masterMeter);

            // ヘッドホン：CUE を押したチャンネルとマスターを HEADPHONES MIX で混ぜる
            this.cueBus = ctx.createGain();
            this.phonesCue = ctx.createGain();
            this.phonesMaster = ctx.createGain();
            this.cueBus.connect(this.phonesCue);
            this.master.connect(this.phonesMaster);

            // 「スピーカー」と「ヘッドホン」のどちらを聴くか
            this.toSpeakers = ctx.createGain();
            this.toPhones = ctx.createGain();
            this.master.connect(this.toSpeakers).connect(this.out);
            this.phonesCue.connect(this.toPhones);
            this.phonesMaster.connect(this.toPhones);
            this.toPhones.connect(this.out);

            this.spectrum = ctx.createAnalyser();
            this.spectrum.fftSize = 2048;
            this.spectrum.smoothingTimeConstant = 0.75;
            this.master.connect(this.spectrum);

            this.ch = [];
            for (let i = 0; i < channels; i++) this.ch.push(this.makeChannel());
            this.xfader = 0.5;
            this.setPhonesMix(0);
            this.setMonitor('speakers');
            this.setMasterLevel(0.75);
            this.applyXfader();
            this.peakHold = { master: 0, clipUntil: 0 };
        }

        makeChannel() {
            const c = {};
            c.input = ctx.createGain();
            c.trim = ctx.createGain();
            c.low = ctx.createBiquadFilter();
            c.low.type = 'lowshelf';
            c.low.frequency.value = 220;
            c.mid = ctx.createBiquadFilter();
            c.mid.type = 'peaking';
            c.mid.frequency.value = 1000;
            c.mid.Q.value = 0.7;
            c.high = ctx.createBiquadFilter();
            c.high.type = 'highshelf';
            c.high.frequency.value = 3000;
            c.filter = ctx.createBiquadFilter();
            c.filter.type = 'allpass';
            c.filter.Q.value = 1.2;
            c.pre = ctx.createGain();
            c.meter = ctx.createAnalyser();
            c.meter.fftSize = 1024;
            c.cue = ctx.createGain();
            c.cue.gain.value = 0;
            c.fader = ctx.createGain();
            c.xf = ctx.createGain();
            // BEAT FX（エコー）：フェーダーの後ろから送るので、フェーダーを下げても残響が残る
            c.send = ctx.createGain();
            c.send.gain.value = 0;
            c.delay = ctx.createDelay(4);
            c.feedback = ctx.createGain();
            c.feedback.gain.value = 0.5;
            c.fbFilter = ctx.createBiquadFilter();
            c.fbFilter.type = 'lowpass';
            c.fbFilter.frequency.value = 3500;
            c.wet = ctx.createGain();
            c.wet.gain.value = 0.8;

            c.input.connect(c.trim).connect(c.low).connect(c.mid).connect(c.high).connect(c.filter).connect(c.pre);
            c.pre.connect(c.meter);
            c.pre.connect(c.cue).connect(this.cueBus);
            c.pre.connect(c.fader).connect(c.xf).connect(this.masterBus);
            c.fader.connect(c.send).connect(c.delay);
            c.delay.connect(c.fbFilter).connect(c.feedback).connect(c.delay);
            c.delay.connect(c.wet).connect(c.xf);

            c.state = { trim: 0.5, eq: { high: 0, mid: 0, low: 0 }, filter: 0, fader: 1, cue: false, echo: false, echoBeats: 0.75, echoDepth: 0.5 };
            this.applyTrim(c);
            this.applyFader(c);
            return c;
        }

        // TRIM：0 で無音、0.5 で 0 dB、1 で +9 dB
        setTrim(i, v) { this.ch[i].state.trim = v; this.applyTrim(this.ch[i]); }
        applyTrim(c) {
            const v = c.state.trim;
            const g = v <= 0.5 ? Math.pow(v / 0.5, 2) : dbGain((v - 0.5) / 0.5 * 9);
            c.trim.gain.setTargetAtTime(g, ctx.currentTime, 0.015);
        }

        // EQ：-1（-26 dB）〜 0（中央）〜 1（+6 dB）
        setEq(i, band, v) {
            const c = this.ch[i];
            c.state.eq[band] = v;
            const db = v < 0 ? v * 26 : v * 6;
            c[band].gain.setTargetAtTime(db, ctx.currentTime, 0.015);
        }

        // CFX（フィルター）：左に回すとローパス、右に回すとハイパス
        setFilter(i, v) {
            const c = this.ch[i];
            c.state.filter = v;
            const f = c.filter;
            if (Math.abs(v) < 0.04) {
                f.type = 'allpass';
                return;
            }
            if (v < 0) {
                f.type = 'lowpass';
                f.frequency.setTargetAtTime(20000 * Math.pow(150 / 20000, -v), ctx.currentTime, 0.02);
            } else {
                f.type = 'highpass';
                f.frequency.setTargetAtTime(20 * Math.pow(5000 / 20, v), ctx.currentTime, 0.02);
            }
        }

        // チャンネルフェーダー：0〜1
        setFader(i, v) { this.ch[i].state.fader = v; this.applyFader(this.ch[i]); }
        applyFader(c) { c.fader.gain.setTargetAtTime(Math.pow(c.state.fader, 2), ctx.currentTime, 0.01); }

        // クロスフェーダー：0（左いっぱい）〜1（右いっぱい）。中央では両方とも最大
        setXfader(v) { this.xfader = v; this.applyXfader(); }
        applyXfader() {
            const v = this.xfader;
            const gains = [Math.min(1, 2 * (1 - v)), Math.min(1, 2 * v)];
            this.ch.forEach((c, i) => {
                const g = this.ch.length === 1 ? 1 : gains[i];
                c.xf.gain.setTargetAtTime(g, ctx.currentTime, 0.01);
            });
        }

        setMasterLevel(v) {
            this.masterLevel = v;
            this.master.gain.setTargetAtTime(v <= 0.75 ? Math.pow(v / 0.75, 2) : dbGain((v - 0.75) / 0.25 * 6), ctx.currentTime, 0.02);
        }

        setCue(i, on) { this.ch[i].state.cue = on; this.ch[i].cue.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.01); }

        // HEADPHONES MIX：0 で CUE だけ、1 でマスターだけ
        setPhonesMix(v) {
            this.phonesMix = v;
            this.phonesCue.gain.setTargetAtTime(Math.cos(v * Math.PI / 2), ctx.currentTime, 0.02);
            this.phonesMaster.gain.setTargetAtTime(Math.sin(v * Math.PI / 2), ctx.currentTime, 0.02);
        }

        // 聴く場所：'speakers'（お客さんに聞こえる音）か 'phones'（ヘッドホンの音）
        setMonitor(where) {
            this.monitor = where;
            this.toSpeakers.gain.setTargetAtTime(where === 'speakers' ? 1 : 0, ctx.currentTime, 0.02);
            this.toPhones.gain.setTargetAtTime(where === 'phones' ? 1 : 0, ctx.currentTime, 0.02);
        }

        // BEAT FX（エコー）
        setEcho(i, { on, beats, depth } = {}) {
            const c = this.ch[i];
            if (on !== undefined) c.state.echo = on;
            if (beats !== undefined) c.state.echoBeats = beats;
            if (depth !== undefined) c.state.echoDepth = depth;
            this.applyEcho(i);
        }
        applyEcho(i) {
            const c = this.ch[i];
            const deck = this.decks[i];
            const bpm = deck ? deck.bpm : 120;
            c.delay.delayTime.setTargetAtTime(Math.min(4, c.state.echoBeats * 60 / bpm), ctx.currentTime, 0.05);
            c.send.gain.setTargetAtTime(c.state.echo ? 0.25 + c.state.echoDepth * 0.6 : 0, ctx.currentTime, 0.01);
            c.feedback.gain.setTargetAtTime(0.35 + c.state.echoDepth * 0.4, ctx.currentTime, 0.05);
        }

        // メーター：直近のピーク（dBFS）
        static peakOf(analyser) {
            const buf = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(buf);
            let p = 0;
            for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
            return gainDb(p);
        }
        levels() {
            const master = Mixer.peakOf(this.masterMeter);
            const now = performance.now();
            if (master > -0.3) this.peakHold.clipUntil = now + 1200;
            return {
                ch: this.ch.map(c => Mixer.peakOf(c.meter)),
                master,
                clip: now < this.peakHold.clipUntil,
            };
        }

        // 低・中・高の音の量（0〜1）
        bands() {
            const data = new Uint8Array(this.spectrum.frequencyBinCount);
            this.spectrum.getByteFrequencyData(data);
            const hz = ctx.sampleRate / this.spectrum.fftSize;
            const avg = (lo, hi) => {
                let s = 0, k = 0;
                for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.min(data.length - 1, Math.ceil(hi / hz)); i++) { s += data[i]; k++; }
                return k ? s / k / 255 : 0;
            };
            return { low: avg(30, 220), mid: avg(220, 3000), high: avg(3000, 14000) };
        }

        stopAll() { this.decks.forEach(d => d && d.pause()); }

        dispose() {
            this.stopAll();
            this.out.disconnect();
        }
    }

    // ========== デッキ ==========
    const LOOKAHEAD = 0.12;
    const decks = new Set();
    let timer = null;
    const startTimer = () => {
        if (timer) return;
        timer = setInterval(() => decks.forEach(d => d.schedule()), 25);
    };

    class Deck {
        constructor(mixer, index, trackId) {
            this.mixer = mixer;
            this.index = index;
            this.channel = mixer.ch[index];
            mixer.decks[index] = this;
            this.tempo = 0;        // テンポスライダー（-1〜1）
            this.range = 0.10;     // テンポの可変幅（±10%）
            this.nudge = 0;        // ジョグの側面を回している間の一時的な速度変化
            this.quantize = true;
            this.onChange = null;  // 状態が変わったときに画面を更新するため
            this.load(trackId);
            decks.add(this);
            startTimer();
        }

        // 曲の id か、曲のオブジェクト（テンポなどを変えたコピー）を受け取る
        load(track) {
            if (this.playing) this.pause();
            this.track = typeof track === 'string' ? TRACKS[track] : track;
            this.channel.input.gain.value = dbGain(this.track.level);
            this.anchors = [{ t: 0, b: 0, speed: 0 }];
            this.playing = false;
            this.cuePoint = 0;
            this.hotcues = new Array(8).fill(null);
            this.loop = null;
            this.pendingIn = null;
            this.syncWith = null;  // SYNC で合わせた相手（再生し始めたときに拍の位置もそろえる）
            this.cueHeld = false;
            this.nodes = [];
            this.nextStep = 0;
            this.ended = false;
            this.changed('load');
        }

        changed(what) { if (this.onChange) this.onChange(what, this); }

        get rate() { return (1 + this.tempo * this.range) * (1 + this.nudge); }
        get bpm() { return this.track.bpm * this.rate; }
        get speed() { return this.playing ? this.bpm / 60 : 0; }   // 1 秒に進む拍数

        // ある時刻の再生位置（拍）
        posAt(t) {
            let a = this.anchors[0];
            for (const x of this.anchors) if (x.t <= t) a = x;
            return a.b + (t - a.t) * a.speed;
        }
        get pos() { return ctx ? this.posAt(ctx.currentTime) : 0; }

        // 今の時刻から再生位置・速度を決め直す（予約済みの音は取り消す）
        reanchor(b) {
            const now = ctx.currentTime;
            const pos = b === undefined ? this.posAt(now) : b;
            this.cancelFuture(now);
            this.anchors = [{ t: now, b: pos, speed: this.speed }];
            this.nextStep = Math.ceil(pos * 4 - 1e-6);
            if (this.mixer.ch[this.index]) this.mixer.applyEcho(this.index);
        }

        cancelFuture(now) {
            this.nodes = this.nodes.filter(x => {
                if (x.t > now + 0.003) {
                    x.nodes.forEach(nd => { try { nd.stop(); nd.disconnect(); } catch (e) { /* 止め済み */ } });
                    return false;
                }
                return x.t > now - 2;
            });
        }

        schedule() {
            if (!this.playing) return;
            const now = ctx.currentTime;
            const horizon = now + LOOKAHEAD;
            const dest = this.channel.input;
            for (let guard = 0; guard < 64; guard++) {
                const a = this.anchors[this.anchors.length - 1];
                const beat = this.nextStep / 4;
                // ループの終わりに来たら、ループの頭に戻る
                if (this.loop && beat >= this.loop.end - 1e-6 && a.b < this.loop.end) {
                    const t = a.t + (this.loop.end - a.b) / a.speed;
                    if (t > horizon) break;
                    this.anchors.push({ t, b: this.loop.start, speed: a.speed });
                    this.nextStep = Math.round(this.loop.start * 4);
                    continue;
                }
                if (beat >= this.track.beats) {
                    if (this.track.loopAll) {
                        const t = a.t + (this.track.beats - a.b) / a.speed;
                        if (t > horizon) break;
                        this.anchors.push({ t, b: 0, speed: a.speed });
                        this.nextStep = 0;
                        continue;
                    }
                    const t = a.t + (this.track.beats - a.b) / a.speed;
                    // 終端で止まったら CUE ポイント（なければ先頭）に戻す。終端に CUE が打たれないように
                    if (now >= t) { this.pause(); this.seek(this.cuePoint || 0); this.ended = true; }
                    break;
                }
                const t = a.t + (beat - a.b) / a.speed;
                if (t > horizon) break;
                if (t >= now - 0.02) {
                    const at = Math.max(now, t);
                    const beatSec = 60 / this.bpm;
                    eventsAt(this.track, this.nextStep).forEach(ev => {
                        this.nodes.push({ t: at, nodes: INSTR[ev.i](dest, at, beatSec, ev) });
                    });
                }
                this.nextStep++;
            }
            // 古いアンカーを捨てる
            while (this.anchors.length > 1 && this.anchors[1].t <= now) this.anchors.shift();
            if (this.nodes.length > 400) this.nodes = this.nodes.filter(x => x.t > now - 2);
        }

        play() {
            ensure();
            claim(this.mixer);
            if (this.playing) return;
            if (this.pos >= this.track.beats - 0.01) this.seek(0);
            this.playing = true;
            this.reanchor();
            // SYNC 中（テンポが相手と同じ）なら、相手が再生中のとき拍の位置もそろえる（rekordbox の BEAT SYNC と同じ）
            const o = this.syncWith;
            if (o && o.playing && Math.abs(this.bpm - o.bpm) < 0.05) this.alignPhase(o);
            this.changed('play');
        }

        pause() {
            if (!this.playing || !ctx) { this.playing = false; return; }
            const pos = this.pos;
            this.playing = false;
            this.reanchor(pos);
            this.changed('play');
        }

        toggle() { if (this.playing) this.pause(); else this.play(); }

        // 位置を移動する。keepPhase のときは、拍の中の位置（拍の頭からのずれ）を保つ
        seek(beat, { keepPhase = false } = {}) {
            if (!ctx) ensure();
            let b = beat;
            if (keepPhase && this.playing) {
                const cur = this.pos;
                b = Math.floor(beat) + (cur - Math.floor(cur));
            }
            b = Math.max(0, Math.min(this.track.beats - 0.001, b));
            // ループの外へ移ったらループを解除する（rekordbox と同じく、ループの外に出たら抜ける）
            if (this.loop && (b < this.loop.start - 1e-6 || b >= this.loop.end - 1e-6)) {
                this.loop = null;
                this.changed('loop');
            }
            this.ended = false;
            this.reanchor(b);
            this.changed('seek');
        }

        // ---- CUE ボタン ----
        // 一時停止中：今の位置を CUE ポイントにする（CUE ポイントにいるときは、押している間だけ再生）
        // 再生中：CUE ポイントに戻って一時停止
        cueDown() {
            ensure();
            if (this.playing && !this.cueHeld) {
                this.seek(this.cuePoint);
                this.pause();
                this.changed('cue');
                return;
            }
            const pos = this.pos;
            if (Math.abs(pos - this.cuePoint) > 0.01) {
                this.cuePoint = this.quantize ? Math.round(pos) : pos;
                this.seek(this.cuePoint);
                this.changed('cue');
                return;
            }
            this.cueHeld = true;
            this.play();
            this.changed('cue');
        }
        cueUp() {
            if (!this.cueHeld) return;
            this.cueHeld = false;
            if (this.playLatched) { this.playLatched = false; this.changed('cue'); return; }
            this.pause();
            this.seek(this.cuePoint);
            this.changed('cue');
        }
        playButton() {
            if (this.cueHeld) { this.playLatched = true; return; }
            this.toggle();
        }

        // ---- ホットキュー ----
        hotcue(i) {
            ensure();
            if (this.hotcues[i] === null) {
                const p = this.pos;
                this.hotcues[i] = this.quantize ? Math.round(p) : p;
                this.changed('hotcue');
                return 'set';
            }
            this.seek(this.hotcues[i], { keepPhase: this.quantize });
            if (!this.playing) this.cuePoint = this.hotcues[i];
            this.changed('hotcue');
            return 'jump';
        }
        clearHotcue(i) { this.hotcues[i] = null; this.changed('hotcue'); }

        // ---- ループ ----
        loopBeats(beats) {
            const p = this.pos;
            // いちばん近い拍から始める（少し先の拍になったときは、そこまで進んでからループに入る）
            const start = this.quantize ? Math.round(p) : p;
            this.loop = { start, end: start + beats };
            this.pendingIn = null;
            this.reanchor();
            this.changed('loop');
        }
        loopIn() {
            const p = this.pos;
            this.pendingIn = this.quantize ? Math.round(p) : p;
            this.changed('loop');
        }
        loopOut() {
            if (this.pendingIn === undefined || this.pendingIn === null) return;
            const p = this.pos;
            let end = this.quantize ? Math.round(p) : p;
            if (end <= this.pendingIn) end = this.pendingIn + 1;
            const start = this.pendingIn;
            this.loop = { start, end };
            this.pendingIn = null;
            // 丸めた end が今の位置以前なら、ループの中の同じ位置へ移って、必ずループさせる
            if (p >= end) this.seek(start + ((p - start) % (end - start)));
            else this.reanchor();
            this.changed('loop');
        }
        exitLoop() {
            this.loop = null;
            this.pendingIn = null;
            this.changed('loop');
        }
        resizeLoop(f) {
            if (!this.loop) return;
            const len = Math.max(0.25, Math.min(64, (this.loop.end - this.loop.start) * f));
            this.loop.end = this.loop.start + len;
            const p = this.pos;
            if (p >= this.loop.end) this.seek(this.loop.start + ((p - this.loop.start) % len));
            else this.reanchor();
            this.changed('loop');
        }

        // ---- ビートジャンプ ----
        beatJump(beats) { this.seek(this.pos + beats, { keepPhase: true }); }

        // ---- テンポ ----
        setTempo(v) {
            this.tempo = Math.max(-1, Math.min(1, v));
            if (this.playing) this.reanchor();
            this.changed('tempo');
        }
        // 目標の BPM にするスライダー位置
        tempoFor(bpm) { return (bpm / this.track.bpm - 1) / this.range; }

        setNudge(v) {
            this.nudge = v;
            if (this.playing) this.reanchor();
            this.changed('tempo');
        }

        // 一時停止中にジョグを回したときのような、少しずつの位置移動
        scrub(beats) { this.seek(this.pos + beats); }

        // SYNC：テンポと拍の位置を相手に合わせる
        syncTo(other) {
            this.setTempo(this.tempoFor(other.bpm));
            this.syncWith = other;
            if (this.playing && other.playing) this.alignPhase(other);
            this.changed('sync');
        }

        // 拍の中の位置（小数部）を相手に合わせる。いちばん近い方向へ動かす（曲の頭より前には戻さない）
        alignPhase(other) {
            const mine = this.pos;
            const theirs = other.pos;
            let d = (theirs - Math.floor(theirs)) - (mine - Math.floor(mine));
            if (d > 0.5) d -= 1;
            if (d < -0.5) d += 1;
            if (mine + d < 0) d += 1;
            if (Math.abs(d) > 1e-4) this.seek(mine + d);
        }

        // 相手との拍のずれ（-0.5〜0.5 拍。正なら自分が先に進んでいる）
        phaseTo(other) {
            const now = ctx.currentTime;
            const a = this.posAt(now);
            const b = other.posAt(now);
            let d = (a - Math.floor(a)) - (b - Math.floor(b));
            if (d > 0.5) d -= 1;
            if (d < -0.5) d += 1;
            return d;
        }

        // 再生位置を「小節.拍」で（1 小節目の 1 拍目が 1.1）
        static barBeat(pos) {
            const b = Math.max(0, Math.floor(pos + 1e-6));
            return { bar: Math.floor(b / 4) + 1, beat: (b % 4) + 1 };
        }

        sectionAt(pos) { return this.track.sections.find(s => pos >= s.start && pos < s.end) || this.track.sections[this.track.sections.length - 1]; }

        destroy() {
            this.pause();
            decks.delete(this);
        }
    }

    // キーの比較用：和音をひとつ鳴らす
    const playChord = (midiNotes, seconds = 2, dest) => {
        ensure();
        const g = ctx.createGain();
        g.gain.value = 0.9;
        g.connect(dest || ctx.destination);
        INSTR.chord(g, ctx.currentTime + 0.02, seconds / 4, { ns: midiNotes, d: 4, pad: true, v: 1 });
        INSTR.bass(g, ctx.currentTime + 0.02, seconds / 4, { n: midiNotes[0] - 24, d: 3.2 });
    };

    return {
        ensure, claim, TRACKS, Mixer, Deck, waveformOf, playChord, midiHz, n,
        get ctx() { return ctx; },
        get running() { return ctx && ctx.state === 'running'; },
    };
})();
