/*
 * DJ 入門コースの構成。
 * ページの見出し、サイドのコース一覧、前後のレッスンへのリンク、トップページの学習マップはここから作る。
 */
const COURSE = [
    {
        id: 'basics',
        title: 'DJ の前提知識',
        desc: '機材をさわる前に知っておきたい、リズム・曲の構成・音・キーの基本。',
        lessons: [
            { id: 'what-is-dj', title: 'DJ はなにをしているのか', min: 10, summary: 'DJ の役割と、コントローラーで DJ をするしくみ。' },
            { id: 'rhythm', title: '拍・小節・BPM', min: 15, summary: '曲のテンポを数で表す BPM と、リズムを数える単位。' },
            { id: 'structure', title: '曲の構成とフレーズ', min: 20, summary: 'ダンスミュージックは 8 小節ごとに変化する。イントロからアウトロまでの地図。' },
            { id: 'sound', title: '音の基本：周波数・EQ・音量', min: 20, summary: '低音・中音・高音の役割と、音割れさせない音量の決め方。' },
            { id: 'key', title: 'キーと曲の相性', min: 15, summary: '曲どうしの響きがぶつかる理由と、相性のよい曲の探し方。' },
            { id: 'music', title: '曲の入手とファイル形式', min: 10, summary: 'DJ 用の曲をどこで手に入れ、どんな形式で持つか。権利の注意点。' },
        ],
    },
    {
        id: 'prepare',
        title: '準備する',
        desc: 'FLX4 と rekordbox を準備し、曲を取り込んで解析し、CUE を打って整理するまで。',
        lessons: [
            { id: 'setup', title: '機材をつないでソフトを準備する', min: 25, summary: '必要なもの、接続の順番、ソフトの選び方とオーディオ設定。' },
            { id: 'tour', title: 'FLX4 の各部とホームポジション', min: 15, summary: 'どこに何があるかの全体像と、毎回の始めに戻す「初期位置」。' },
            { id: 'rb-screen', title: 'rekordbox の画面の見かた', min: 20, summary: 'PERFORMANCE モードのデッキ・波形・ブラウザー・ミキサーの見かた。' },
            { id: 'rb-settings', title: 'rekordbox の設定を整える', min: 15, summary: '解析・キー表示・テンポの幅など、最初に見直しておきたい環境設定。' },
            { id: 'analyze', title: '曲を取り込んで解析する', min: 20, summary: 'BPM・ビートグリッド・キーを解析させ、ずれていたら直す。' },
            { id: 'cue', title: 'CUE を打つ', min: 20, summary: 'CUE ボタンの動きと、ホットキュー・メモリーキューを打つ場所。' },
            { id: 'rb-library', title: '曲を整理して探す', min: 20, summary: 'プレイリスト、インテリジェントプレイリスト、タグや評価、検索で、次の曲をすぐ見つける。' },
        ],
    },
    {
        id: 'mix',
        title: 'つなぐ',
        desc: 'ヘッドホンで次の曲を準備し、テンポとフレーズをそろえて、2 曲をつなぐ。',
        lessons: [
            { id: 'monitor', title: 'ヘッドホンで次の曲を聴く', min: 15, summary: 'お客さんに聴かせずに次の曲を準備する、モニターのしかた。' },
            { id: 'beatmatch', title: 'テンポを合わせる（ビートマッチ）', min: 30, summary: 'SYNC で合わせる方法と、耳とテンポスライダーで合わせる方法。' },
            { id: 'phrasing', title: 'フレーズの頭でつなぐ', min: 25, summary: '次の曲を「いつ」再生するか。フレーズをそろえる考え方。' },
            { id: 'first-mix', title: 'はじめてのミックス', min: 30, summary: 'フェーダーと EQ で低音を入れ替える、いちばん基本のつなぎ。' },
        ],
    },
    {
        id: 'expand',
        title: '表現を広げる',
        desc: 'ループ、エフェクト、パッド、rekordbox の演奏機能と、セットの組み立て、クラブの機材への持ち出し。',
        lessons: [
            { id: 'loops', title: 'ループとビートジャンプ', min: 20, summary: '曲の一部をくり返してつなぎの時間をつくる、位置を飛ばしてフレーズを合わせる。' },
            { id: 'effects', title: 'エフェクト：CFX と BEAT FX', min: 20, summary: 'フィルターとエコーを中心に、エフェクトの使いどころ。' },
            { id: 'pads', title: 'パッドを使ったテクニック', min: 15, summary: 'ホットキュー、PAD FX、サンプラーで曲に変化をつける。' },
            { id: 'rb-features', title: 'rekordbox の演奏機能', min: 25, summary: 'サンプラーデッキ、シーケンサー、STEMS、MIX POINT LINK など、rekordbox ならではの機能。' },
            { id: 'set', title: '選曲とセットの組み立て', min: 20, summary: '次の曲の選び方と、30 分〜1 時間のセットの流れの作り方。' },
            { id: 'anchor-set', title: '1 曲を軸にミニセットを組む', min: 25, summary: '必ずかけたい 1 曲を決め、前後の曲を選んで 3〜4 曲のミニセットを組み、録音する。' },
            { id: 'tempo-jump', title: 'テンポの違う曲をつなぐ', min: 25, summary: '128 BPM の 4 つ打ちから 140 BPM の半テンへ。テンポの固まりを作り、エコーアウトや切り替えで移る。' },
            { id: 'rb-export', title: 'クラブの機材で DJ する', min: 20, summary: 'EXPORT モードで USB メモリーに曲を書き出したり、PRO DJ LINK でつないだりして、CDJ などで使う。' },
            { id: 'practice', title: '練習のしかたと次のステップ', min: 15, summary: '毎日の練習メニュー、録音して聴き返す方法、よくある失敗。' },
        ],
    },
];

// 付録のページ（コースの順番には入れない）
const APPENDIX = [
    { id: 'glossary', title: '用語集', summary: 'このサイトに出てくる DJ 用語の一覧。' },
    { id: 'trouble', title: '困ったとき', summary: '音が出ない、認識しないなどのトラブルの確かめ方。' },
];
