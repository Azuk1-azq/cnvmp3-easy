# cnvmp3 ボタン

YouTube の動画ページに **MP3 / MP4 ボタン**を追加し、変換サービス cnvmp3 をバックグラウンドで操作して、ワンクリックで変換・保存できるようにする Chrome 拡張機能です。

- 対応ブラウザ: Google Chrome(Chromium 系ブラウザでも動く可能性がありますが、動作確認はしていません)
- 表示言語: 日本語 / English

> **はじめに必ずお読みください。** この拡張機能は非公式の個人制作物です。ご利用の前に、下の「免責事項」と「著作権・利用規約についての注意」に同意できる場合のみ使ってください。

---

## 主な機能

- YouTube の動画ページ(通常の動画・Shorts)に MP3 / MP4 ボタンを表示
- 音質(64〜320kbps)・画質(360〜1080p)を設定、または「今回だけ」変更
- 変換の進捗をカードで表示、完了時に通知音(オン/オフ可)
- 保存後に「フォルダで表示」
- 拡張機能アイコンから設定ページを開く、設定のリセット(初期設定)
- アップデートの確認と、GitHub 上のファイルによる更新

## インストール

この拡張機能は Chrome ウェブストアでは配布していません。ZIP を解凍して手動で読み込みます。

1. 配布ページから `CNVMP3BUTTON.zip` をダウンロードし、解凍する
2. Chrome で `chrome://extensions` を開く
3. 右上の「**デベロッパー モード**」をオンにする
4. 「**パッケージ化されていない拡張機能を読み込む**」を押し、解凍した `cnvmp3-button` フォルダを選ぶ
5. 初回の設定画面で、言語と音質・画質を選ぶ

> 解凍したフォルダを削除・移動すると、拡張機能が動かなくなります。移動する場合は、読み込み直してください。

## 使い方

1. YouTube で動画を開く
2. 高評価ボタンの横(Shorts では右側)に出る **MP3** または **MP4** を押す
3. 画面右下の進捗カードに従い、完了するとダウンロードフォルダに保存される

ボタンの横のプルダウンで、その1回だけ音質・画質を変えられます。いつもの設定は、ツールバーの拡張機能アイコンから変更します。

## 設定

拡張機能アイコンを押すと開くポップアップ(または「設定」ボタンで開くタブ)で変更できます。

| 項目 | 内容 |
| --- | --- |
| 言語 | 日本語 / English |
| MP3 の音質・MP4 の画質 | いつも使う設定 |
| cnvmp3 の画面を表示する | 通常は非表示。うまく変換できないときの確認用 |
| 今回だけ音質・画質を変える | YouTube 上のプルダウンの表示/非表示 |
| 完了時に通知音 / 完了カードを閉じるまで | 通知の設定 |
| 更新があるとき | YouTube とポップアップに通知 / ポップアップだけに通知 / 自動でダウンロード |
| 初期設定をする | 保存している設定をすべて消し、最初の設定画面を開く |

## アップデート

- 6 時間ごと、ブラウザ起動時、ポップアップを開いたときに、GitHub の `update/manifest.json` のバージョンを確認します。
- 新しい版があるときは、設定に応じて YouTube の左下とポップアップに知らせます。
- **今すぐアップデート:** 専用ページで拡張機能のフォルダを選ぶと、GitHub の `update/` にあるファイルで自動的に入れ替わり、再読み込みされます。
- **アップデートをダウンロード:** ZIP をダウンロードして、手動で上書きする方法です。
- フォルダの場所が分からないときは、「拡張機能のフォルダを開く」から案内ページを開いてください。

## 必要な権限と、通信する先

この拡張機能が使う権限と、その理由です。

| 権限 | 用途 |
| --- | --- |
| `www.youtube.com` | ボタン・進捗カード・更新通知の表示 |
| `cnvmp3.com` | 変換サービスの操作(非表示の iframe 内で動作) |
| `storage` | 設定の保存(ブラウザ内) |
| `downloads` | 変換したファイルの保存状況の取得、「フォルダで表示」、更新 ZIP のダウンロード |
| `declarativeNetRequest` | cnvmp3.com を iframe 内で動かすため、cnvmp3.com の iframe 表示を妨げる応答ヘッダー(`x-frame-options` と `content-security-policy`)を取り除く |
| `alarms` | 更新確認の定期実行 |
| `raw.githubusercontent.com` / `api.github.com` | 更新情報・更新ファイルの取得 |

### 個人情報・データの扱い

- 設定はお使いのブラウザ内(`chrome.storage.local`)にだけ保存され、開発者のサーバーには送信されません。開発者は利用者のデータを収集していません。
- 変換のために、**変換する YouTube 動画の URL が cnvmp3.com に送られます。** cnvmp3.com での取り扱いは、cnvmp3 側の規約・プライバシーポリシーに従います。
- 更新確認のため、GitHub に接続します。このとき、GitHub 側で IP アドレスなどが記録される場合があります。
- 更新用に選んだフォルダへの参照は、ブラウザ内(IndexedDB)に保存されます。この拡張機能のフォルダ以外には書き込みません(選んだフォルダの `manifest.json` を確認し、この拡張機能のものでなければ中止します)。
- ポップアップの「支援する」リンクは外部サイトへ移動します。

## 免責事項

1. この拡張機能は「現状のまま(AS IS)」で提供されます。動作、正確性、特定の目的への適合性、継続的な提供について、いかなる保証もしません。
2. この拡張機能の利用、または利用できなかったことによって生じたいかなる損害(データの損失、PC・ブラウザの不具合、アカウントの停止・制限、第三者とのトラブルなど)についても、開発者は一切の責任を負いません。**すべて自己責任でご利用ください。**
3. この拡張機能は、cnvmp3 などの外部サービスの仕組みに依存しています。外部サービスの仕様変更・停止・有料化・規約変更などにより、予告なく動作しなくなることがあります。外部サービスの提供内容やその安全性について、開発者は責任を負いません。
4. 更新機能は、GitHub 上のファイルで拡張機能のファイルを書き換えます。更新の前に、必要に応じて現在のフォルダのコピーを取っておいてください。更新に失敗した場合の復旧も、利用者ご自身で行ってください。
5. この拡張機能は予告なく変更・提供終了することがあります。サポートや不具合の修正をお約束するものではありません。

## 著作権・利用規約についての注意

- **著作権を守ってください。** YouTube 上の動画・音楽・音声などの多くは、著作権で保護されています。権利者の許可なく複製(ダウンロード)することは、国や地域の法律で禁止または制限されている場合があります。たとえば日本では、違法にアップロードされたものと知りながら行うダウンロードや、技術的保護手段の回避などが問題になることがあります。
- 変換・保存してよいかどうかは、**利用者ご自身の責任で判断してください。** 自分が権利を持つ動画、権利者が許可している動画、ライセンス上利用が認められている動画など、**適法に利用できるものに限って**使用してください。
- 保存したファイルを、再配布・販売・公開・アップロードしないでください。私的に利用できる範囲かどうかも、法律や権利者の条件に従って、ご自身で確認してください。
- YouTube の利用規約は、許可されている場合を除き、コンテンツのダウンロードを禁止しています。この拡張機能の利用により、YouTube(Google)のアカウントに対する措置などを受けても、開発者は責任を負いません。
- cnvmp3.com の利用には、cnvmp3 側の利用規約が適用されます。必ず確認してください。
- この拡張機能は、**YouTube、Google、cnvmp3 およびその運営者とは一切関係のない、非公式のものです。** 各名称・ロゴは、それぞれの権利者に帰属します。
- この拡張機能は、**著作権侵害や規約違反を目的とするものではありません。** 違法・不正な目的での利用を、開発者は推奨も容認もしません。
- 本文書は法的助言ではありません。法律上の判断が必要な場合は、専門家にご相談ください。

## トラブルシューティング

| 症状 | 確認すること |
| --- | --- |
| ボタンが出ない | YouTube のタブを再読み込みする。拡張機能が有効か確認する |
| 変換が始まらない・失敗する | 設定で「cnvmp3 の画面を表示する」をオンにして、cnvmp3 側の状態を確認する。cnvmp3 のサイト構造が変わると動かなくなることがあります |
| 更新が確認できない | ポップアップの「今すぐ確認」で表示される理由(`http 404` など)を確認する。ネットワーク接続も確認する |
| 更新でフォルダを選べない | `Downloads` や `Documents` などのフォルダ自体は選べません。拡張機能のフォルダ(`cnvmp3-button`)を選んでください |
| 設定がおかしくなった | ポップアップの「初期設定をする」を2回押してリセットする |

## ライセンス

ライセンスは定められていないため、複製・改変・再配布は不可です。

## 連絡先・不具合報告

不具合や要望は、配布元の GitHub の Issues へお願いします。対応をお約束するものではありません。

---

# English summary

**cnvmp3 Button** is an unofficial Chrome extension that adds MP3 / MP4 buttons to YouTube and drives the third-party converter cnvmp3 in the background.

- **No affiliation.** This project is not affiliated with, endorsed by, or connected to YouTube, Google, or cnvmp3.
- **No warranty / no liability.** The software is provided "AS IS" without warranty of any kind. The author is not liable for any damages arising from its use, including data loss, account restrictions, or disputes with third parties. Use it at your own risk.
- **Respect copyright and Terms of Service.** Most content on YouTube is protected by copyright, and YouTube's Terms of Service generally prohibit downloading content unless permitted. Only convert content you own, content the rights holder has allowed, or content whose license permits it. You are solely responsible for complying with the laws of your country and the terms of every service you use. Do not redistribute, sell, or upload the files you save.
- **Privacy.** Settings stay in your browser. The URL of the video you convert is sent to cnvmp3.com. Update checks connect to GitHub. The author does not collect your data.
- **Install.** Unzip `CNVMP3BUTTON.zip`, enable Developer mode at `chrome://extensions`, click "Load unpacked", and select the `cnvmp3-button` folder.
- **Updates.** The extension checks `update/manifest.json` on GitHub. "Update now" replaces the files in the folder you choose with the files in the repository's `update/` folder, then reloads the extension. Back up your folder first if needed.
- **License.** No license is granted, so copying, modification, and redistribution are not permitted.
