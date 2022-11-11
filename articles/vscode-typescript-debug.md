---
title: "Typescriptのデバッグ方法"
emoji: "📘"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["typescript","debug","vscode"]
published: false
---

# Typescriptのデバッグ方法
## `.vscode/launch.json`を作成

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch TypeScript",
      "preLaunchTask": "Compile TypeScript",
      "cwd": "${workspaceFolder}",
      "program": "${file}"
    }
  ]
}

```

### launch.jsonとは
- VSCodeでデバッグ実行するための設定ファイル
- 作業ディレクトリの`.vscode`ディレクトリ配下に作成する
- [公式ドキュメント](https://code.visualstudio.com/docs/editor/debugging#_launchjson-attributes)

### 各種パラメータ
- version
  - 不明
- configurations
  - type
    - 起動に使用するデバッガの種類。Nodeデバッガならnode。PHPならphp。Goならgo。
  - request
    - 起動のリクエストタイプ。"launch"と"attach"がサポートされている
  - name
    - デバッグを選択する際に表示されるドロップダウンの項目名
  - preLaunchTask
    - デバッグを開始する前に起動するタスク。`tasks.json`でタスクを定義できる。
  - cwd
    - 作業ディレクトリ
  - program
    - デバッガ起動時に実行する実行ファイル名

> 変数の参照(${file}等)に関しては、[こちら](https://code.visualstudio.com/docs/editor/variables-reference)

## `.vscode/tasks.json`を作成
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Compile TypeScript",
      "type": "typescript",
      "tsconfig": "tsconfig.json",
      "problemMatcher": ["$tsc"]
    }
  ]
}
```

### tasks.jsonとは
- ソフトウェアシステムのリント、ビルド、パッケージング、テスト、デプロイなどのタスクの開始を設定できる。
  - ツールの多くをVS Code内から使用することができる
- [公式ドキュメント](https://code.visualstudio.com/docs/editor/tasks)

### 各種パラメータ
- version
  - 不明
- tasks
  - label
    - タスクのラベル
  - type
    - タスクのタイプ
  - tsconfig
    - tsconfigのパス？ 
  - problemMatcher
    - タスクの結果と連動してソースファイルの問題点を問題パネルに表示する
    - VSCodeはあらかじめいくつかの"problemMatcher"を定義している
      - $tsc は定義済みの"problemMatcher"
    - 参考：[【VSCode】タスクの問題マッチャ―(problemMatcher)を理解してみる](https://note.affi-sapo-sv.com/vscode-task-problemmatcher.php)


## `tsconfig.json`を作成
```tsconfig.json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "sourceMap": true,
    "outDir": "./build/js/",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

- `sourceMap`は`true`とする
  - jsファイルとtsファイルを紐づけるため


## テスト用のファイル `debug.ts`を作成
```debug.ts
const test = 1 + 2;
console.log({ test });
```

## デバッグテスト
### ブレークポイントを設置する

### デバッグの実行