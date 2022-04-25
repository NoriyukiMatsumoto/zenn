---
title: "React Native + GitHub ActionsでAndroidアプリをデプロイ"
emoji: "📘"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["ReactNative","react","GitHubActions","DeployGate"]
published: true
---

## 概要
React Native + GitHub ActionsでAndroidアプリをビルドして、DeployGateアップロードする方法をまとめる。

## 仕様
- ビルドしてDeployGateにデプロイする。
- developブランチとstagingブランチにプッシュされたタイミングで実施する。
- developブランチとstagingブランチで読み込む環境変数を変える。
- DeployGateに渡す`message`と`distribution_name`
  - `message`：gitにショートハッシュ値
  - `distribution_name`：ブランチ名


### 前提
ビルドを実施するコードは、以下のようなディレクトリ構成となっている。
```bash
.
├── App.tsx
├── README.md
├── android # Androidアプリ
├── app.json
├── assets
├── babel.config.js
├── index.js
├── ios # iosアプリ
├── jest.config.js
├── metro.config.js
├── package.json
├── react-native.config.js
├── src # コード
├── .env.development # 開発時に使用する環境変数
├── .env.staging # 検証時に使用する環境変数
├── .env.production # 本番時に使用する環境変数
├── tsconfig.json
└── yarn.lock
```
### コード

```yml:deploy-android.yml
name: Deploy android app
on:
  push:
    branches:
      - develop
      - staging
    paths:
      - ".github/workflows/deploy-android.yml"
jobs:
  deploy-android:
    runs-on: ubuntu-latest
    container: reactnativecommunity/react-native-android
    steps:
      - name: checkout
        uses: actions/checkout@v2

      - name: Extract branch name # 説明1
        shell: bash
        run: echo "::set-output name=branch::${GITHUB_REF#refs/heads/}"
        id: extract_branch

      - name: copy env staging # 説明2
        if: ${{ steps.extract_branch.outputs.branch == 'staging' }}
        run: cp .env.staging .env
      
      - name: copy env develop # 説明2
        if: ${{ steps.extract_branch.outputs.branch == 'develop' }}
        run: cp .env.development .env

      - name: yarn install
        run: yarn --frozen-lockfile

      - name: Build Android Debug # 説明3
        run: ./gradlew assembleRelease

      - name: Deploy App # 説明4
        working-directory: ./android
        run: |
          curl \
            -H "Authorization: token ${{secrets.DEPLOY_GATE_API_KEY}}" \
            -F "file=@app/build/outputs/apk/release/app-release.apk" \
            -F "message=$(git rev-parse --short HEAD)" \
            -F "distribution_name=${{ steps.extract_branch.outputs.branch }}" \
            -v "https://deploygate.com/api/users/${{secrets.DEPLOY_GATE_USER_NAME}}/apps"
```

#### 説明1
ブランチ名を記録する。DeployGateにデプロイする際に利用する。
`::set-output`に関してはこちらを参考ください。
https://docs.github.com/ja/actions/using-workflows/workflow-commands-for-github-actions

`${GITHUB_REF#refs/heads/}`でブランチ名を取得しています。

#### 説明2
ブランチによって、読み込む`.env`を変更する。
developブランチであれば、`.env.develop`をビルド時に読み込み
stagingブランチであれば、`.env.staging`をビルド時に読み込む。

#### 説明3
ビルドを実施する。
`./gradlew assembleRelease`
コマンドを実行できるのは、`reactnativecommunity/react-native-android`を読み込んでいるため。
https://hub.docker.com/r/reactnativecommunity/react-native-android

#### 説明4
ビルドファイルをDeployGateにデプロイする。
`DEPLOY_GATE_API_KEY`には、DeployGateのアカウント設定 -> プロフィール設定 -> プロフィールの下部にある`API key`を設定する。
![](/images/deploy-android-from-githubactions/api-key.png)

`DEPLOY_GATE_USER_NAME`には、DeployGateに登録したユーザー名を設定する。
`$(git rev-parse --short HEAD)`でショートハッシュ値を取得している。

APIの詳細はこちらを参考ください。
https://docs.deploygate.com/reference/upload

## まとめ
意外と簡単にできる。
ブランチにマージされるたびにデプロイが実施されて、ユーザーにすぐ確認してもらえるので便利。
distributionをブランチ名にすることで、どのコードが動いているのかわかりやすい。
![](/images/deploy-android-from-githubactions/distribution.png)