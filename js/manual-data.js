/*
 * DDJ-FLX4 Web マニュアルのデータ。
 * 取扱説明書 (DRJ1092-A) の「各部の名称とはたらき」と「操作する（応用編）」を要約したもの。
 *
 * 操作 (action) の書式:
 *   how:   操作のしかた（押す / 回す / スライドする ...）
 *   shift: true なら [SHIFT] を押しながらの操作
 *   text:  何が起きるか
 *   only:  'mac' | 'ios' | 'pro' のとき、そのソフトだけの機能
 *   deck:  1 | 2 のとき、そのデッキ側だけの動作
 */
const SOFTWARE = {
    mac: { label: 'rekordbox (Mac/Windows)', family: 'rb' },
    ios: { label: 'rekordbox (iOS/Android)', family: 'rb' },
    serato: { label: 'Serato DJ Lite', family: 'se' },
};

const SECTIONS = {
    browse: 'ブラウズ部',
    deck: 'デッキ部',
    mixer: 'ミキサー部',
    fx: 'エフェクト部',
    rear: '本体背面部',
    front: '本体前面部',
};

const CONTROLS = {
    /* ========== ブラウズ部 ========== */
    load: {
        name: 'LOAD ボタン',
        section: 'browse',
        page: { rb: 12, se: 14 },
        rb: [
            { how: '押す', text: 'ブラウザで選んでいるトラックを、このボタン側のデッキにロードします。' },
            { how: '2回押す', text: 'もう一方のデッキのトラックを、このデッキにもロードします。再生中なら同じ位置から再生されます（インスタントダブルス）。' },
            { how: '押す', shift: true, only: 'mac', deck: 1, text: 'ツリービューの［関連するトラック］にカーソルを移動します。' },
            { how: '押す', shift: true, only: 'mac', deck: 2, text: 'デッキ表示を小さくしてブラウズエリアを広げます。もう一度押すと元に戻ります。' },
            { how: '押す', shift: true, only: 'ios', deck: 1, text: 'ブラウズ画面の［関連するトラック］を表示します。' },
            { how: '押す', shift: true, only: 'ios', deck: 2, text: 'ブラウズ画面を表示します。' },
        ],
        se: [
            { how: '押す', text: 'ライブラリで選んでいるトラックを、このボタン側のデッキにロードします。' },
            { how: '2回押す', text: 'もう一方のデッキのトラックを、このデッキにもロードします。再生中なら同じ位置から再生されます（インスタントダブルス）。' },
            { how: '押す', shift: true, deck: 1, text: 'ライブラリのトラックリストを BPM 順に並べ替えます。' },
            { how: '押す', shift: true, deck: 2, text: 'ライブラリのトラックリストをアーティスト順に並べ替えます。' },
        ],
    },
    browse: {
        name: 'ロータリーセレクター',
        section: 'browse',
        page: { rb: 13, se: 14 },
        rb: [
            { how: '回す', text: 'rekordbox のカーソルを上下に動かします。' },
            { how: '回す', shift: true, only: 'mac', text: '拡大波形の表示倍率を変えます。右回しで拡大、左回しで縮小。' },
            { how: '押す', only: 'mac', text: 'ツリービューとトラックリスト（表示中ならプレイリストパレットも）の間でカーソルを移動します。カーソルがフォルダーにあるときはフォルダーを開きます。' },
            { how: '押す', only: 'ios', text: '下の階層に移動します。' },
            { how: '押す', shift: true, only: 'mac', text: 'ツリービューとトラックリストの間でカーソルを移動します。カーソルがフォルダーにあるときはフォルダーを閉じます。' },
            { how: '押す', shift: true, only: 'ios', text: '上の階層に移動します。' },
        ],
        se: [
            { how: '回す', text: 'ライブラリや crates パネルのカーソルを上下に動かします。' },
            { how: '押す', text: 'crates パネルとライブラリの間でカーソルを移動します。［Files］パネルでは下の階層に移動します。' },
            { how: '押す', shift: true, text: 'crates パネルでは subcrates を開閉、ライブラリでは crates パネルに移動、［Files］パネルでは上の階層に移動します。' },
        ],
    },

    /* ========== デッキ部 ========== */
    in: {
        name: 'IN ボタン',
        section: 'deck',
        page: { rb: 15, se: 20 },
        both: [
            { how: '押す', text: 'ループの開始点（ループイン）を設定します。' },
            { how: 'ループ中に押す', text: 'ジョグを回してループの開始点を微調整できます（IN ADJ）。' },
        ],
    },
    out: {
        name: 'OUT ボタン',
        section: 'deck',
        page: { rb: 15, se: 21 },
        rb: [
            { how: '押す', text: 'ループの終了点（ループアウト）を設定し、ループ再生を始めます。' },
            { how: 'ループ中に押す', text: 'ジョグを回してループの終了点を微調整できます（OUT ADJ）。' },
        ],
        se: [
            { how: '押す', text: 'ループの終了点（ループアウト）を設定し、ループ再生を始めます。' },
            { how: 'ループ中に押す', text: 'ジョグを回してループの終了点を微調整できます（OUT ADJ）。' },
            { how: '押す', shift: true, text: 'VINYL モードをオン／オフします。' },
        ],
    },
    beat4: {
        name: '4 BEAT/EXIT ボタン',
        section: 'deck',
        page: { rb: 16, se: 21 },
        rb: [
            { how: '押す', text: '押した位置から 4 拍のオートループを始めます。' },
            { how: 'ループ中に押す', text: 'ループ再生を解除します。' },
            { how: '押す', shift: true, text: '再生位置にいちばん近い保存済みループ（トラックに保存したもの、またはホットキューに登録したもの）をアクティブループに設定／解除します。アクティブループは、再生位置がその先頭を通過すると自動でループを始めます（ACTIVE）。' },
        ],
        se: [
            { how: '押す', text: '押した位置から 4 拍のオートループを始めます。' },
            { how: 'ループ中に押す', text: 'ループ再生を解除します。' },
            { how: '押す', shift: true, text: 'ループのアクティブ／非アクティブを切り替えます（ACTIVE）。' },
        ],
    },
    callL: {
        name: 'CUE/LOOP CALL ◀ ボタン',
        section: 'deck',
        page: { rb: 16, se: 21 },
        rb: [
            { how: '押す', text: 'トラックに保存したキューポイント／ループポイントを、前方向に選んで呼び出します。' },
            { how: 'ループ中に押す', text: 'ループの長さを半分にします（1/2X）。' },
            { how: '押す', shift: true, text: '呼び出しているキューポイント／ループポイントを削除します（DEL）。' },
        ],
        se: [
            { how: 'ループ中に押す', text: 'ループの長さを半分にします（1/2X）。' },
            { how: '押す', only: 'pro', text: 'ループスロットを選びます。' },
        ],
    },
    callR: {
        name: 'CUE/LOOP CALL ▶ ボタン',
        section: 'deck',
        page: { rb: 16, se: 22 },
        rb: [
            { how: '押す', text: 'トラックに保存したキューポイント／ループポイントを、後ろ方向に選んで呼び出します。' },
            { how: 'ループ中に押す', text: 'ループの長さを 2 倍にします（2X）。' },
            { how: '押す', shift: true, text: 'キュー待機中ならそのキューポイントを、ループ中ならそのループをトラックに保存します（MEMORY）。' },
        ],
        se: [
            { how: 'ループ中に押す', text: 'ループの長さを 2 倍にします（2X）。' },
            { how: '押す', only: 'pro', text: 'ループスロットを選びます。' },
        ],
    },
    sync: {
        name: 'BEAT SYNC ボタン',
        section: 'deck',
        page: { rb: 17, se: 22 },
        rb: [
            { how: '押す', text: '同期のマスターに設定したデッキに、テンポ（ピッチ）とビートグリッドを自動で合わせます。' },
            { how: 'シンク中に押す', text: 'ビートシンクを解除します。' },
            { how: '1 秒以上押す', text: 'このデッキを同期のマスターに設定します（MASTER）。' },
            { how: '押す', shift: true, text: '押すたびに TEMPO スライダーの可変幅が ±6% → ±10% → ±16% → WIDE と切り替わります（TEMPO RANGE）。' },
            { how: '左右同時に 1 秒以上押す', only: 'ios', text: 'iOS/Android 機器との Bluetooth 接続を解除します。' },
        ],
        se: [
            { how: '押す', text: '両デッキのテンポ（ピッチ）とビートグリッドを自動で合わせます。' },
            { how: '1 秒以上押す', text: 'SYNC を解除します。' },
            { how: '押す', shift: true, text: '押すたびに TEMPO スライダーの可変幅が ±8% → ±16% → ±50% → ±8% と切り替わります（TEMPO RANGE）。' },
        ],
    },
    tempo: {
        name: 'TEMPO スライダー',
        section: 'deck',
        page: { rb: 18, se: 22 },
        both: [
            { how: 'スライドする', text: 'トラックの再生速度を調整します。可変幅は SHIFT + BEAT SYNC で切り替えます。' },
        ],
    },
    'mode-hotcue': {
        name: 'HOT CUE モードボタン',
        section: 'deck',
        page: { rb: 18, se: 22 },
        rb: [
            { how: '押す', text: 'パッドをホットキューモードにします。', mode: 'hotcue' },
            { how: '押す', shift: true, text: 'パッドをキーボードモードにします（KEYBOARD）。', mode: 'keyboard' },
        ],
        se: [
            { how: '押す', text: 'パッドをホットキューモードにします。', mode: 'hotcue' },
            { how: '押す', shift: true, only: 'pro', text: 'パッドをピッチプレイモードにします。', mode: 'pitchplay' },
        ],
    },
    'mode-padfx': {
        name: 'PAD FX1 モードボタン',
        section: 'deck',
        page: { rb: 18, se: 23 },
        rb: [
            { how: '押す', text: 'パッドをパッド FX モード 1 にします。', mode: 'padfx1' },
            { how: '押す', shift: true, text: 'パッドをパッド FX モード 2 にします（PAD FX2）。', mode: 'padfx2' },
        ],
        se: [
            { how: '押す', text: 'パッドをパッド FX モードにします。', mode: 'padfx' },
            { how: '押す', shift: true, only: 'pro', text: 'パッドをロールモードにします。', mode: 'roll' },
        ],
    },
    'mode-beatjump': {
        name: 'BEAT JUMP モードボタン',
        section: 'deck',
        page: { rb: 18, se: 23 },
        rb: [
            { how: '押す', text: 'パッドをビートジャンプモードにします。', mode: 'beatjump' },
            { how: '押す', shift: true, text: 'パッドをビートループモードにします（BEAT LOOP）。', mode: 'beatloop' },
        ],
        se: [
            { how: '押す', text: 'パッドをビートジャンプモードにします。', mode: 'beatjump' },
            { how: '押す', shift: true, text: 'パッドをオートループモードにします。', mode: 'autoloop' },
        ],
    },
    'mode-sampler': {
        name: 'SAMPLER モードボタン',
        section: 'deck',
        page: { rb: 19, se: 23 },
        rb: [
            { how: '押す', text: 'パッドをサンプラーモードにします。', mode: 'sampler' },
            { how: '押す', shift: true, text: 'パッドをキーシフトモードにします（KEY SHIFT）。', mode: 'keyshift' },
        ],
        se: [
            { how: '押す', text: 'パッドをサンプラーモードにします。', mode: 'sampler' },
            { how: '押す', shift: true, only: 'pro', text: 'パッドをキーシフトモードにします（KEY SHIFT）。', mode: 'keyshift' },
        ],
    },
    pad: {
        name: 'パフォーマンスパッド',
        section: 'deck',
        page: { rb: 19, se: 24 },
        both: [
            { how: '押す', text: '選んでいるパッドモードに応じて、ホットキュー、エフェクト、ループなどを操作します。パッドモードは上の 4 つのモードボタンで切り替えます。' },
        ],
    },
    play: {
        name: 'PLAY/PAUSE ボタン',
        section: 'deck',
        page: { rb: 19, se: 24 },
        rb: [
            { how: '押す', text: 'トラックを再生／一時停止します。' },
        ],
        se: [
            { how: '押す', text: 'トラックを再生／一時停止します。' },
            { how: '押す', shift: true, text: 'テンポラリーキューポイントに戻って、そのまま再生を続けます（スタッター）。' },
        ],
    },
    cue: {
        name: 'CUE ボタン',
        section: 'deck',
        page: { rb: 19, se: 24 },
        both: [
            { how: '一時停止中に押す', text: 'その位置にキューポイントを設定します。' },
            { how: '再生中に押す', text: 'キューポイントに戻って一時停止します（バックキュー）。' },
            { how: 'キューポイントで押し続ける', text: '押している間だけ再生し、離すとキューポイントに戻ります（キューポイントサンプラー）。' },
            { how: '押す', shift: true, text: '再生位置をトラックの先頭に戻します。' },
        ],
    },
    shift: {
        name: 'SHIFT ボタン',
        section: 'deck',
        page: { rb: 19, se: 24 },
        both: [
            { how: '押しながら他を操作', text: '他のボタンやつまみの別の機能を呼び出します。この画面では、SHIFT を押した状態（キーボードの Shift キーでも可）で各部をクリックすると SHIFT 機能を確認できます。' },
        ],
    },
    jog: {
        name: 'ジョグ',
        section: 'deck',
        page: { rb: 20, se: 25 },
        rb: [
            { how: '天面を回す', only: 'mac', text: 'VINYL モードがオンのとき、スクラッチします。オフのときはピッチベンド（一時的な速度調整）になります。VINYL モードは rekordbox のショートカットキーで切り替えます。' },
            { how: '天面を回す', only: 'ios', text: 'スクラッチします。' },
            { how: '外周部を回す', text: 'ピッチベンド（一時的な速度調整）をします。' },
            { how: '天面を回す', shift: true, text: '回した方向にトラックを高速で送ります（SEARCH）。' },
        ],
        se: [
            { how: '天面を回す', text: 'VINYL モードがオンのとき、スクラッチします。オフのときはピッチベンドになります。VINYL モードは SHIFT + OUT で切り替えます。' },
            { how: '外周部を回す', text: 'ピッチベンド（一時的な速度調整）をします。' },
            { how: '天面を回す', shift: true, text: 'VINYL モードがオンのとき、回した方向にトラックを高速で送ります（SEARCH）。' },
            { how: '天面を回す', shift: true, only: 'pro', text: 'VINYL モードがオフのとき、ビートに合わせて再生位置をスキップします（スキップモード）。ビートグリッドが必要で、［SYNC MODE］を［Smart Sync］にしておく必要があります。' },
        ],
    },

    /* ========== ミキサー部 ========== */
    trim: {
        name: 'TRIM ノブ',
        section: 'mixer',
        page: { rb: 26, se: 29 },
        both: [{ how: '回す', text: 'チャンネルごとの音量レベルを調整します。' }],
    },
    master: {
        name: 'MASTER LEVEL ノブ',
        section: 'mixer',
        page: { rb: 26, se: 29 },
        both: [{ how: '回す', text: 'マスター出力の音量を調整します。' }],
    },
    mastercue: {
        name: 'ヘッドホン CUE ボタン（MASTER）',
        section: 'mixer',
        page: { rb: 26, se: 29 },
        both: [{ how: '押す', text: 'マスター出力の音をヘッドホンで聴けるようにします。' }],
    },
    midi: {
        name: 'Bluetooth MIDI インジケーター',
        section: 'mixer',
        page: { rb: 26, se: 29 },
        both: [
            { how: '点滅', text: 'iOS/Android 機器と Bluetooth で接続されていません。' },
            { how: '点灯', text: 'iOS/Android 機器と Bluetooth で接続されています。' },
            { how: '消灯', text: 'USB 接続した DJ アプリケーションを認識しています。' },
        ],
    },
    meter: {
        name: 'チャンネルレベルインジケーター',
        section: 'mixer',
        page: { rb: 27, se: 29 },
        both: [{ how: '表示', text: '各チャンネルの、チャンネルフェーダーを通る前の音量レベルを表示します。' }],
    },
    eq: {
        name: 'EQ（HI / MID / LOW）ノブ',
        section: 'mixer',
        page: { rb: 27, se: 29 },
        both: [{ how: '回す', text: 'チャンネルごとに高域・中域・低域の音量を上げ下げします。' }],
    },
    mic: {
        name: 'MIC LEVEL ノブ',
        section: 'mixer',
        page: { rb: 27, se: 29 },
        both: [{ how: '回す', text: '背面の MIC 入力端子に入るマイクの音量を調整します。上げすぎると大音量になるので注意してください。' }],
    },
    cfx: {
        name: 'CFX ノブ',
        section: 'mixer',
        page: { rb: 27, se: 30 },
        rb: [
            { how: 'SMART CFX オフのとき', only: 'mac', text: 'チャンネルに SOUND COLOR FX をかけます。センターでは原音のままです。' },
            { how: 'SMART CFX オンのとき', only: 'mac', text: 'チャンネルに SMART CFX をかけます。センターでは原音のままです。' },
            { how: 'SMART CFX オフのとき', only: 'ios', text: '常に原音が出力されます。' },
            { how: 'SMART CFX オンのとき', only: 'ios', text: 'チャンネルに SOUND COLOR FX をかけます。センターでは原音のままです。' },
        ],
        se: [
            { how: 'SMART CFX オフのとき', text: 'チャンネルにフィルターをかけます。左に回すとローパス、右に回すとハイパスのフィルターが効いていきます。センターでは原音のままです。' },
            { how: 'SMART CFX オンのとき', text: 'チャンネルに SMART CFX をかけます。センターでは原音のままです。' },
        ],
    },
    smartcfx: {
        name: 'SMART CFX ボタン',
        section: 'mixer',
        page: { rb: 27, se: 30 },
        rb: [
            { how: '押す', only: 'mac', text: 'SMART CFX モードをオン／オフします。' },
            { how: '押す', only: 'ios', text: 'SOUND COLOR FX をオン／オフします。' },
            { how: '押す', shift: true, only: 'mac', text: 'SMART CFX のプリセット（エフェクトの種類）を変えます（FX SELECT）。' },
            { how: '押す', shift: true, only: 'ios', text: 'SOUND COLOR FX の種類を変えます（FX SELECT）。' },
        ],
        se: [
            { how: '押す', text: 'SMART CFX モード（プリセット 1）をオン／オフします。' },
            { how: '押す', shift: true, text: 'SMART CFX モード（プリセット 2）をオン／オフします。' },
        ],
    },
    chcue: {
        name: 'ヘッドホン CUE ボタン（CH）',
        section: 'mixer',
        page: { rb: 28, se: 30 },
        rb: [
            { how: '押す', text: 'このチャンネルの音をヘッドホンで聴けるようにします。' },
            { how: 'タップする', shift: true, only: 'mac', text: 'タップした間隔で、そのデッキのテンポを設定します（タップ機能）。' },
        ],
        se: [
            { how: '押す', text: 'このチャンネルの音をヘッドホンで聴けるようにします。' },
            { how: 'タップする', shift: true, text: 'タップした間隔で、そのデッキのテンポを設定します（タップ機能）。' },
        ],
    },
    hpmix: {
        name: 'HEADPHONES MIX ノブ',
        section: 'mixer',
        page: { rb: 28, se: 30 },
        both: [{ how: '回す', text: 'ヘッドホンで聴く音の、CUE を押したチャンネル（左）とマスター（右）のバランスを調整します。' }],
    },
    hplevel: {
        name: 'HEADPHONES LEVEL ノブ',
        section: 'mixer',
        page: { rb: 28, se: 31 },
        both: [{ how: '回す', text: 'ヘッドホンの音量を調整します。' }],
    },
    smartfader: {
        name: 'SMART FADER ボタン',
        section: 'mixer',
        page: { rb: 28, se: 31 },
        rb: [
            { how: '押す', text: 'SMART FADER モードをオン／オフします。オンの間は、フェーダー操作に合わせて BPM・EQ LOW・ECHO が自動で調整されます。' },
        ],
        se: [
            { how: '押す', text: 'SMART FADER モード（プリセット 1）をオン／オフします。' },
            { how: '押す', shift: true, text: 'SMART FADER モード（プリセット 2）をオン／オフします。' },
        ],
    },
    chfader: {
        name: 'チャンネルフェーダー',
        section: 'mixer',
        page: { rb: 28, se: 31 },
        both: [
            { how: 'スライドする', text: 'チャンネルの出力音量を調整します。' },
            { how: 'スライドする', shift: true, text: 'フェーダースタート：いちばん手前から上げると、キューポイントから再生が始まります。再生中にいちばん手前まで戻すと、キューポイントに戻って一時停止します。' },
        ],
    },
    xfader: {
        name: 'クロスフェーダー',
        section: 'mixer',
        page: { rb: 29, se: 31 },
        both: [
            { how: 'スライドする', text: 'クロスフェーダーカーブの設定に従って、左右に割り当てたチャンネルの音を切り替え・ミックスします。' },
            { how: 'スライドする', shift: true, text: 'フェーダースタート：端から反対側へ動かすと、キューポイントから再生が始まります。再生中に元の端へ戻すと、キューポイントに戻って一時停止します。' },
        ],
    },

    /* ========== エフェクト部 ========== */
    fxch: {
        name: 'BEAT FX CH SELECT スイッチ',
        section: 'fx',
        page: { rb: 32, se: 33 },
        rb: [{ how: 'スライドする', text: 'BEAT FX をかけるチャンネルを 1 / 2 / 1&2 から選びます。' }],
        se: [{ how: 'スライドする', only: 'pro', text: 'FX をかけるチャンネルを 1 / 2 / 1&2 から選びます。' }],
    },
    fxselect: {
        name: 'BEAT FX SELECT ボタン',
        section: 'fx',
        page: { rb: 32, se: 33 },
        rb: [
            { how: '押す', text: 'BEAT FX の種類を、プルダウンメニューの次（下）のエフェクトに切り替えます。' },
            { how: '押す', shift: true, text: 'BEAT FX の種類を、プルダウンメニューの前（上）のエフェクトに切り替えます。' },
        ],
        se: [
            { how: '押す', text: 'FX の種類を、プルダウンメニューの次（下）のエフェクトに切り替えます。' },
            { how: '押す', shift: true, text: 'FX の種類を、プルダウンメニューの前（上）のエフェクトに切り替えます。' },
        ],
    },
    beatL: {
        name: 'BEAT ◀ ボタン',
        section: 'fx',
        page: { rb: 32, se: 34 },
        rb: [
            { how: '押す', text: 'エフェクトを同期させる拍数を小さくします。' },
            { how: '押す', shift: true, text: 'テンポモードを BPM オートモードにします。トラックの BPM がエフェクトのテンポの基準になります（AUTO）。' },
        ],
        se: [
            { how: '押す', text: 'エフェクトを同期させる拍数を小さくします。' },
            { how: '押す', shift: true, text: 'テンポモードを BPM オートモードにします。トラックの BPM がエフェクトのテンポの基準になります（AUTO）。' },
        ],
    },
    beatR: {
        name: 'BEAT ▶ ボタン',
        section: 'fx',
        page: { rb: 33, se: 34 },
        both: [
            { how: '押す', text: 'エフェクトを同期させる拍数を大きくします。' },
            { how: 'タップする', shift: true, text: 'テンポモードを BPM タップモードにします。ボタンをタップした間隔からエフェクトの基準 BPM を決めます（TAP）。' },
        ],
    },
    depth: {
        name: 'BEAT FX LEVEL/DEPTH ノブ',
        section: 'fx',
        page: { rb: 33, se: 34 },
        both: [{ how: '回す', text: 'エフェクトのかかり具合（量的パラメーター）を調整します。' }],
    },
    fxon: {
        name: 'BEAT FX ON/OFF ボタン',
        section: 'fx',
        page: { rb: 33, se: 34 },
        rb: [
            { how: '押す', text: 'BEAT FX をオン／オフします。オンの間はボタンが点滅します。' },
            { how: '押して離す', shift: true, text: 'かかっていた BEAT FX をオフにして、リリース FX をかけます（RELEASE FX）。' },
        ],
        se: [
            { how: '押す', text: 'FX をオン／オフします。' },
        ],
    },

    /* ========== 背面・前面（図には描いていない部分） ========== */
    usbpower: {
        name: 'USB 端子（電源専用）',
        section: 'rear',
        page: { rb: 35, se: 35 },
        both: [{ how: '接続', text: '市販の USB 電源アダプターやモバイルバッテリーをつなぎます。ケーブルは USB 認証品を使います。' }],
    },
    usbdevice: {
        name: 'USB 端子（デバイス接続用）',
        section: 'rear',
        page: { rb: 35, se: 35 },
        both: [{ how: '接続', text: 'PC/Mac や iOS/Android 機器とつなぎます。Type-C 機器には付属ケーブル、Type-A 機器には 3 m 以下の USB 認証品、Lightning 機器には 3 m 以下の Apple 認証品を使います。' }],
    },
    monostereo: {
        name: 'Android MONO/STEREO スイッチ',
        section: 'rear',
        page: { rb: 35, se: 35 },
        both: [{ how: '切り替える', text: 'Android 端末をつないだときの音声の出力方式を切り替えます（初期設定は STEREO）。マスター音声が乱れたりヘッドホンが無音になったりする端末では、MONO にすると直ることがあります。' }],
    },
    masterout: {
        name: 'MASTER 出力端子（RCA）',
        section: 'rear',
        page: { rb: 35, se: 35 },
        both: [{ how: '接続', text: 'パワードスピーカーやパワーアンプをつなぎます。RCA ピンジャックのアンバランス出力です。' }],
    },
    micin: {
        name: 'MIC 入力端子（1/4" TS）',
        section: 'rear',
        page: { rb: 36, se: 36 },
        both: [{ how: '接続', text: 'マイクをつなぎます。6.35 mm のフォーンプラグ、アンバランス入力のみに対応しています。' }],
    },
    micatt: {
        name: 'MIC ATT.（アッテネーター）ノブ',
        section: 'rear',
        page: { rb: 36, se: 36 },
        both: [{ how: '回す', text: 'マイクの入力レベルを、使うマイクに合わせて事前に調整します。プレイ中の音量は天面の MIC LEVEL で調整します。' }],
    },
    kensington: {
        name: 'ケンジントンロック装着用穴',
        section: 'rear',
        page: { rb: 36, se: 36 },
        both: [{ how: '装着', text: '盗難防止用のワイヤーロックを取り付けます。' }],
    },
    phones: {
        name: 'ヘッドホン出力端子',
        section: 'front',
        page: { rb: 37, se: 37 },
        both: [{ how: '接続', text: 'ヘッドホンをつなぎます。3.5 mm ステレオミニプラグ、インピーダンス 32 Ω 以上のヘッドホンに対応しています。' }],
    },
};

/*
 * パッドモード。pads は 1〜8 の順（上段 1〜4、下段 5〜8）。
 *   [短い表示, 説明]
 * shiftPads: SHIFT を押しながらのときの割り当て（あれば）
 * deck2Pads: デッキ 2 で割り当てが変わる場合
 * proPads:   Serato DJ Pro での割り当て
 */
const SERATO_FIXED = [
    ['PREV', '前のトラックをロードします（プレビアストラック）。'],
    ['◀◀', '押している間、逆方向にサーチします。'],
    ['▶▶', '押している間、順方向にサーチします。'],
    ['CENSOR', '押している間だけ逆再生し、離すと通常の再生に戻ります（Censor）。'],
];

const rbSemitones = ['+4', '+5', '+6', '+7', '±0', '+1', '+2', '+3'];
const seSemitones = ['±0', '+1', '+2', '+3', '−4', '−3', '−2', '−1'];

const PAD_MODES = {
    rb: {
        hotcue: {
            name: 'HOT CUE',
            page: 57,
            desc: '空いているパッドを押すと、その位置をホットキューとして登録します。登録済みのパッドを押すと、そこから再生します。ループ中に押すとループを登録でき、押すとループインから再生します。',
            notes: ['SHIFT + パッドで登録を消去します。', 'rekordbox for Mac/Windows ではホットキューは 1 曲 16 か所まで保存できますが、本機からは A〜H の 8 か所を操作できます。'],
            pads: 'ABCDEFGH'.split('').map(c => [c, `ホットキュー ${c}`]),
        },
        keyboard: {
            name: 'KEYBOARD',
            page: 64,
            desc: 'まず使いたいホットキューのパッドを押して選びます（未登録なら現在位置が登録されます）。その後は各パッドに割り当てた音程で、そのホットキューを鍵盤のように再生します。',
            notes: ['ホットキューを選び直すには SHIFT + HOT CUE モードボタンを押します。', 'SHIFT + パッド 1〜6 で選んだホットキューを削除します。', 'SHIFT + パッド 7 / 8 で割り当てる音程のページを上げ下げします（Mac/Windows）。'],
            pads: rbSemitones.map(s => [s, `${s} セミトーンでホットキューを再生します。`]),
            shiftPads: [...Array(6)].map(() => ['DEL', '選んだホットキューを削除します。']).concat([['PAGE▲', '音程のページを上げます。'], ['PAGE▼', '音程のページを下げます。']]),
        },
        padfx1: {
            name: 'PAD FX1',
            page: 59,
            desc: 'パッドを押している間だけ、割り当てたエフェクトがかかります。離すとオフになります。',
            notes: ['リリース FX を割り当てたパッドを押して離すと、かかっていたエフェクトを止めてリリース FX をかけます。', 'エフェクトの割り当ては rekordbox 側で変更できます。'],
            pads: 'ABCDEFGH'.split('').map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]),
            shiftPads: 'IJKLMNOP'.split('').map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]),
            ios: ['ROLL 1/2', 'SWEEP 80', 'FLANGER 16/1', 'V.BRAKE 3/4', 'ECHO 1/4', 'ECHO 1/2', 'REVERB 60', 'R.ECHO 1/2'],
        },
        padfx2: {
            name: 'PAD FX2',
            page: 59,
            desc: 'パッド FX モード 2 です。パッドを押している間だけ、割り当てたエフェクトがかかります。',
            notes: ['リリース FX を割り当てたパッドを押して離すと、かかっていたエフェクトを止めてリリース FX をかけます。'],
            pads: ['Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'].map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]),
            shiftPads: ['Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF'].map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]),
            ios: ['SLIP LOOP 1/4', 'SLIP LOOP 1/2', 'SLIP LOOP 1/1', 'R.ECHO 3/4', 'TRANS 1/8', 'TRANS 1/4', 'TRANS 1/2', 'R.ECHO 1/2'],
        },
        beatjump: {
            name: 'BEAT JUMP',
            page: 61,
            desc: 'リズムを崩さずに、割り当てた拍数だけ再生位置を前後に移動します。奇数のパッドは戻る方向、偶数のパッドは進む方向です。',
            notes: ['SHIFT + パッド 7 / 8 で、各パッドに割り当てる拍数を小さく／大きくします（Mac/Windows）。'],
            pads: [['◀ 1', 1, '◀'], ['1 ▶', 1, '▶'], ['◀ 2', 2, '◀'], ['2 ▶', 2, '▶'], ['◀ 4', 4, '◀'], ['4 ▶', 4, '▶'], ['◀ 8', 8, '◀'], ['8 ▶', 8, '▶']]
                .map(([l, n, d]) => [l, `${n} 拍${d === '◀' ? '戻ります' : '進みます'}。`]),
            shiftPads: [null, null, null, null, null, null, ['拍数−', '割り当てる拍数を小さくします。'], ['拍数＋', '割り当てる拍数を大きくします。']],
            ios: ['◀ 1', '1 ▶', '◀ 4', '4 ▶', '◀ 8', '8 ▶', '◀ 16', '16 ▶'],
        },
        beatloop: {
            name: 'BEAT LOOP',
            page: 65,
            desc: 'パッドを押すと、割り当てた拍数のループを始めます。指を離してもループは続き、同じパッドをもう一度押すと解除します。',
            notes: [],
            pads: ['1/4', '1/2', '1', '2', '4', '8', '16', '32'].map(n => [n, `${n} 拍のループを始めます。`]),
        },
        sampler: {
            name: 'SAMPLER',
            page: 62,
            desc: 'パッドに割り当てたサンプラースロットの音を鳴らします。再生中にもう一度押すと先頭から鳴らし直します。',
            notes: ['再生中に SHIFT + パッドでそのスロットを止めます。', 'Mac/Windows：ブラウザでトラックを選んで SHIFT + パッドを押すと、そのスロットにロードします。'],
            pads: [1, 2, 3, 4, 5, 6, 7, 8].map(n => [`S${n}`, `サンプラースロット ${n} を鳴らします。`]),
            deck2Pads: [9, 10, 11, 12, 13, 14, 15, 16].map(n => [`S${n}`, `サンプラースロット ${n} を鳴らします。`]),
            ios: ['Clapsnare', 'Short Clap', 'Drop FX', 'Horn', 'Kick', 'Hat', 'Razer', 'Siren'],
            iosNote: 'iOS/Android 版の初期プリセット（デッキ 1）。デッキ 2 は別のプリセットです。',
        },
        keyshift: {
            name: 'KEY SHIFT',
            page: 66,
            desc: 'パッドを押すと、再生中のトラックのキー（調）を割り当てた音程に変えます。',
            notes: ['SHIFT + パッド 7 / 8 で割り当てる音程のページを上げ下げします（Mac/Windows）。'],
            pads: rbSemitones.map(s => [s, `キーを ${s} セミトーンにします。`]),
            shiftPads: [null, null, null, null, null, null, ['PAGE▲', '音程のページを上げます。'], ['PAGE▼', '音程のページを下げます。']],
        },
    },
    se: {
        hotcue: {
            name: 'HOT CUE',
            page: 93,
            desc: '空いているパッドを押すと、その位置をホットキューとして登録します。登録済みのパッドを押すと、そこから再生します。',
            notes: ['SHIFT + パッドで登録を消去します。', 'Serato DJ Lite ではホットキューは 1 曲 4 か所までです。'],
            pads: 'ABCD'.split('').map(c => [c, `ホットキュー ${c}`]).concat(SERATO_FIXED),
            proPads: 'ABCDEFGH'.split('').map(c => [c, `ホットキュー ${c}`]),
        },
        pitchplay: {
            name: 'PITCH PLAY',
            page: 96,
            pro: true,
            desc: 'SHIFT + パッドで使うホットキューを選び、パッドを押すと割り当てた音程でそのホットキューから再生します（Pitch \'n Time DJ のアクティベートが必要）。',
            notes: [],
            pads: seSemitones.map(s => [s, `${s} セミトーンでホットキューから再生します。`]),
        },
        padfx: {
            name: 'PAD FX',
            page: 94,
            desc: 'パッドを押している間、割り当てたエフェクトがかかります。指を離すか、もう一度押すとオフになります。',
            notes: [],
            pads: 'ABCD'.split('').map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]).concat(SERATO_FIXED),
            proPads: 'ABCDEFGH'.split('').map(c => [`FX ${c}`, `エフェクト ${c} をかけます。`]),
        },
        roll: {
            name: 'ROLL',
            page: 97,
            pro: true,
            desc: 'パッドを押している間、割り当てた拍数でループロールします。裏で再生は進み続け、離すと進んだ位置から再生を再開します。',
            notes: ['ロール中に CUE/LOOP CALL ◀ / ▶ でロールの拍数を変えられます。'],
            pads: ['1/4', '1/2', '1', '2'].map(n => [n, `${n} 拍でループロールします。`]).concat(SERATO_FIXED),
            proPads: ['1/32', '1/16', '1/8', '1/4', '1/2', '1', '2', '4'].map(n => [n, `${n} 拍でループロールします。`]),
        },
        beatjump: {
            name: 'BEAT JUMP',
            page: 95,
            desc: '再生位置を拍単位で前後に移動します。',
            notes: [],
            pads: [['◀ JUMP', '左（戻る）方向にビートジャンプします。'], ['幅 ½', 'ビートジャンプの幅を半分にします。'], ['幅 ×2', 'ビートジャンプの幅を 2 倍にします。'], ['JUMP ▶', '右（進む）方向にビートジャンプします。']].concat(SERATO_FIXED),
        },
        autoloop: {
            name: 'AUTO LOOP',
            page: 98,
            desc: '再生中にパッドを押すと、割り当てた拍数のループを始めます。離してもループは続き、同じパッドをもう一度押すと解除します。',
            notes: [],
            pads: ['1', '2', '4', '8'].map(n => [n, `${n} 拍のループを始めます。`]).concat(SERATO_FIXED),
            proPads: ['1/8', '1/4', '1/2', '1', '2', '4', '8', '16'].map(n => [n, `${n} 拍のループを始めます。`]),
        },
        sampler: {
            name: 'SAMPLER',
            page: 95,
            desc: 'パッドに割り当てたサンプラースロットの音を鳴らします。スロットには Serato の［SAMPLER］パネルでトラックをドラッグ＆ドロップしてロードします。',
            notes: ['SHIFT + パッドで再生中のスロットを止めます。'],
            pads: [1, 2, 3, 4].map(n => [`S${n}`, `サンプラースロット ${n} を鳴らします。`]).concat(SERATO_FIXED),
            proPads: [1, 2, 3, 4, 5, 6, 7, 8].map(n => [`S${n}`, `サンプラースロット ${n} を鳴らします。`]),
        },
        keyshift: {
            name: 'KEY SHIFT',
            page: 99,
            pro: true,
            desc: 'パッドを押すと、再生中のトラックのキー（調）を割り当てた音程に変えます（Pitch \'n Time DJ のアクティベートが必要）。',
            notes: [],
            pads: seSemitones.map(s => [s, `キーを ${s} セミトーンにします。`]),
        },
    },
};

/*
 * 操作ガイド。各ステップで光らせるコントロールを ctl に並べる。
 * sw があるときは、そのソフトのときだけ表示する。
 */
const GUIDES = [
    {
        id: 'manual-loop',
        title: '好きな区間をループする',
        steps: [
            { ctl: ['in'], text: '再生中、ループを始めたい位置で IN を押します。' },
            { ctl: ['out'], text: 'ループを終わりたい位置で OUT を押すと、ループ再生が始まります。' },
            { ctl: ['callL', 'callR'], text: 'ループ中に CUE/LOOP CALL ◀ で長さを半分、▶ で 2 倍にできます。' },
            { ctl: ['in', 'out', 'jog'], text: 'ループ中に IN（または OUT）を押してからジョグを回すと、開始点（終了点）を微調整できます。' },
            { ctl: ['beat4'], text: '4 BEAT/EXIT を押すとループを抜けて、そのまま再生が続きます。' },
        ],
    },
    {
        id: '4beat-loop',
        title: 'ワンタッチで 4 拍ループ',
        steps: [
            { ctl: ['beat4'], text: '再生中に 4 BEAT/EXIT を押すと、その位置から 4 拍のループが始まります。' },
            { ctl: ['callL', 'callR'], text: 'ループ中に CUE/LOOP CALL ◀ / ▶ で長さを半分／2 倍にできます。' },
            { ctl: ['beat4'], text: 'もう一度 4 BEAT/EXIT を押すとループを解除します。' },
        ],
    },
    {
        id: 'hotcue',
        title: 'ホットキューを登録して呼び出す',
        steps: [
            { ctl: ['mode-hotcue'], text: 'HOT CUE モードボタンを押してホットキューモードにします。', mode: 'hotcue' },
            { ctl: ['pad'], text: '再生中か一時停止中に、空いているパッドを押してその位置を登録します。' },
            { ctl: ['pad'], text: '登録したパッドを押すと、その位置から再生します。' },
            { ctl: ['shift', 'pad'], text: 'SHIFT を押しながらパッドを押すと、登録を消去します。', shift: true },
        ],
    },
    {
        id: 'cue',
        title: 'キューポイントを使う',
        steps: [
            { ctl: ['play'], text: 'PLAY/PAUSE で、キューポイントにしたい位置で一時停止します。' },
            { ctl: ['cue'], text: '一時停止中に CUE を押すと、その位置がキューポイントになります。' },
            { ctl: ['cue'], text: '再生中に CUE を押すとキューポイントに戻って止まります。CUE を押し続けている間だけ再生することもできます。' },
            { ctl: ['shift', 'callR'], text: 'SHIFT + CUE/LOOP CALL ▶ で、設定したキューポイントをトラックに保存します。', shift: true, sw: 'rb' },
            { ctl: ['callL', 'callR'], text: '保存したキューポイントは CUE/LOOP CALL ◀ / ▶ で呼び出せます。', sw: 'rb' },
        ],
    },
    {
        id: 'fader-start',
        title: 'フェーダースタート',
        steps: [
            { ctl: ['cue'], text: '再生を始めたい位置で一時停止して CUE を押し、キューポイントを設定します。' },
            { ctl: ['shift', 'chfader'], text: 'SHIFT を押しながらチャンネルフェーダーをいちばん手前から上げると、キューポイントから再生が始まります。', shift: true },
            { ctl: ['shift', 'chfader'], text: '再生中に SHIFT を押しながらいちばん手前まで戻すと、キューポイントに戻って一時停止します。', shift: true },
            { ctl: ['shift', 'xfader'], text: 'クロスフェーダーでも同じことができます。端に寄せておき、SHIFT を押しながら反対側へ動かすと再生が始まります。', shift: true },
        ],
    },
    {
        id: 'beat-fx',
        title: 'BEAT FX をかける',
        steps: [
            { ctl: ['fxselect'], text: 'BEAT FX SELECT でエフェクトの種類を選びます（SHIFT を押しながらだと逆順）。' },
            { ctl: ['fxch'], text: 'CH SELECT スイッチで、かけるチャンネル（1 / 2 / 1&2）を選びます。' },
            { ctl: ['beatL', 'beatR'], text: 'BEAT ◀ / ▶ で、エフェクトを同期させる拍数を選びます。' },
            { ctl: ['fxon'], text: 'ON/OFF を押すとエフェクトがかかります。' },
            { ctl: ['depth'], text: 'LEVEL/DEPTH でかかり具合を調整します。' },
            { ctl: ['shift', 'fxon'], text: 'SHIFT を押しながら ON/OFF を押して離すと、エフェクトを止めてリリース FX をかけます。', shift: true, sw: 'rb' },
        ],
    },
    {
        id: 'smart-fader',
        title: 'SMART FADER でミックスする',
        sw: 'rb',
        steps: [
            { ctl: ['load'], text: 'デッキ 1 とデッキ 2 にトラックをロードします。' },
            { ctl: ['smartfader'], text: 'SMART FADER を押してオンにします。オンの間はビートシンクがオンになります。' },
            { ctl: ['chfader', 'xfader'], text: 'フェーダーを動かすと、BPM・EQ LOW・ECHO が自動で調整されて自然につながります。' },
            { ctl: ['smartfader'], text: 'もう一度 SMART FADER を押すとオフになります。' },
        ],
    },
    {
        id: 'monitor',
        title: 'ヘッドホンで次の曲を聴く',
        steps: [
            { ctl: ['chcue'], text: '聴きたいチャンネルの CUE ボタンを押します。' },
            { ctl: ['hpmix'], text: 'HEADPHONES MIX で、CUE の音とマスターの音のバランスを調整します。' },
            { ctl: ['hplevel'], text: 'HEADPHONES LEVEL でヘッドホンの音量を調整します。' },
            { ctl: ['mastercue'], text: 'マスターの音を聴くときは、MASTER の CUE を押します。' },
        ],
    },
    {
        id: 'mic',
        title: 'マイクを使う',
        steps: [
            { ctl: ['micin'], text: '背面の MIC 入力端子にマイクをつなぎます。' },
            { ctl: ['micatt'], text: '背面の MIC ATT. で、マイクに合わせて入力レベルを調整しておきます。' },
            { ctl: ['mic'], text: 'プレイ中は天面の MIC LEVEL でマイクの音量を調整します。' },
        ],
    },
];
