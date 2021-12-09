# SSA変換とSCCP最適化をJavaScriptで実装してみた。

## はじめに

このプロジェクトはSSA変換およびSCCP最適化(スパース条件付き定数伝播最適化)をJavaScriptで実装してみたものです。
SSA変換はコードフローグラフを破壊的な変数(レジスタ)を無くして非破壊的なレジスタとファイ関数によって構成するようにしたSSA形式に変換する処理です。
SCCP最適化は、常に固定値に評価されるプログラム内の変数と式を検出し、実行時ではなくコンパイル時にそれらの値を計算する最適化処理です。
今回は非常にやる気がなくてですね、いい加減な文章になっていることを先にお詫び申し上げておきます。[静的単一代入（SSA）形式][SSA] に依存して分析の効率を向上させ（スパース）、実行されない制御フローエッジを検出する機能により、従来の定数伝播とは一線を画しています。一定の分岐条件（条件付き）によれるかもしれないけど。みたいな英語を機械翻訳しただけのものをちゃんと翻訳するといいです。TODO: 後でちゃんと書く。

## 動機

LLVM を Rust で実装する Vicis に SCCP パスがあったのですが、OOPな作りが自分には難しく感じました。
そこでコーネル大学のBrilという最適化パス学習用の授業のブログを参考に JavaScript で大幅に書き換えてみました。

で、詳しく説明をしたいのですが、モチベーションが低くてやる気がないので
大幅に説明はカットしてお送りします。

## 構文

S式的にJSONの配列を使った代数的データ型的な使い方で命令を実装しております。本来であれば、BNFで構文を書きたいところであるのですが、なにぶんやる気がないので割愛します。 `["const","a",1]` がconst a=1 みたいな感じの命令列として実装することでコーネル大学の Bril より短いのが売りです。

例:

    ["func","main",[],{
    "enter":[
        ["const","a",1],
        ["add","b","a","a"],
        ["const","cond",false],
        ["br","cond","then","else"]],
    "then":[
        ["add","b","b","a"],
        ["jmp","end"]],
    "else":[
        ["print","b"],
        ["jmp","end"]],
    "end":[
        ["ret"]]
    }]

図1. main関数の例

破壊できる形式になってて `["add","b","b","a"]` は `b = b + a` の意味です。

    i                              整数
    x                              変数
    l                              ラベル
    n ::=                          インストラクション
        | ["const",x,i]            定数
        | ["id",x,x]               コピー
        | ["add",x,x,x]            加算
        | ["br",x,l,l]             分岐
        | ["jmp",l]                ラベル
        | ["print",x]              プリント
        | ["ret"]                  リターン
    b ::= [n1,...nn]               ブロック
    c ::= {l1:b1,...,ln:bn}        コードフローグラフ
    f ::= ["func",x,[x1,...,xn],c] 関数
    p ::= [f1,...,fn]              プログラム

図2. 構文

    省略

図3. 評価規則

## ソース一覧

- cfg.js コードフローグラフにまつわるソースでございます。
- dom.js これは支配辺境周りの処理に関するソースでございます。
- ssa.js これはSSA変換をするソースでございます。
- cp.js コピープロパゲーション最適化をするソースでございます。
- sccp.js これはSCCP最適化にまつわるソースでございます。
- main.js これはメインとなる処理についてのソースでございます。

バックエンドの最適化周りはかなり自作言語界でもブラックボックスな領域であるように思われます。短いソースがあるとわかりやすいだろうと言うことであります。上から順番に読んでもらうと良いと思います。

### cfg.pl

da_with,a_map,d_with,succsessors,output_prog関数があります。
da_withはディスティネーションとアーギュメントを受け取って破壊的に書き換える関数fdとfaを受け取ってインストラクションを渡すと書き換える関数です。さまざまな命令をいい感じに処理してくれます。
a_mapはアーギュメント部分のみをマップする関数を受け取って書き換えた新しいインストラクションを返します。
d_withはda_withのディスティネーションオンリーな関数です。
successorsはコードフローの次のラベルを求めます。
output_progはプログラム全体を受け取って良い感じに改行を加えたJSON文字列を出力します。

## dom.pl

これは支配辺境の計算をするかなり短いプログラムになっております。

union,intersectionは集合の合併と交差を求めます。
map_invはラベルのマップをひっくり返します。
orderは後続succとルートrootを受け取って辿る順番を返します。
get_domは支配関係を求め、dom_frontsは支配辺境を求めます。dom_treeが支配木を求めget_domsが支配木と支配辺境を求めます。

87行と短いわりに割と速い実装なはずです。これをより高速にするにはTarjanのアルゴリズムを使うと良いです。

## ssa.js

SSA変換をするんです。
v2bnamesが変数からブロック名のマップを作ります。
get_phisがファイを求め、insert_phisがファイを挿入します。ssa_renameで名前を書き換えます。
ssaがssa変換をする処理のメイン関数です。
後続succを求め後続から支配木や支配辺境を求めてファイを取得しリネームした後ファイノードを挿入することでSSA変換ができます。

このSSA変換はLLVMのmem2regやCPS変換にも応用できる処理です。

## cp.js

これは処理的にはSCCP最適化をしてから行うと良い最適化処理ですが、簡単なので先に説明します。

"id"命令があったらコピーするだけなので作られた変数を参照している箇所に書き換える最適化処理です。

## sccp.js

ここで説明するプログラムでは一番複雑な最適化処理ですが255行くらいなのでよく読んでみてください。

## まとめ

Rustでのプログラミングは高速で動くので良いのですがメモリ管理が複雑になりがちで難しかった。
Brilは良いのですが代数的データ型的に書き換えた方が簡単になるはずだ。
最初からコードフローな形にしておけばもっと短く書ける。
JSONを扱うならJavaScriptが最適だろう。
と言うことでJavaScriptで書いて短く書けて誰でもわかるようなプログラムにできました。
説明はいい加減なので地道にアップデートしていきたいと思いますが、書き換えなさそうなので参考にもっといいものを誰か書いてください。

## 参照

https://github.com/hsk/sccp_js
