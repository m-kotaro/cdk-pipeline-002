# Implementation Plan: CDK Pipeline Sample

## Overview

AWS CDK Pipelines を使用したクロスアカウント・マルチリージョンデプロイのサンプルプロジェクトを実装する。既存ファイルのリライトと新規ファイル作成により、S3 ソーストリガー、Parameter Store 参照、デュアルエントリポイント（Pipeline_Deploy / Direct_Deploy）、東京・大阪マルチリージョン構成を実現する。

## Tasks

- [x] 1. プロジェクト基盤の整備
  - [x] 1.1 ディレクトリ構造の作成と package.json の更新
    - `cdk/lib/pipeline/` ディレクトリを作成する
    - `cdk/lib/resources/tokyo/` ディレクトリを作成する
    - `cdk/lib/resources/osaka/` ディレクトリを作成する
    - `cdk/package.json` のプロジェクト名を `cdk-pipeline-002` に変更し、bin エントリを `bin/pipeline-app.js` に更新する
    - 既存の `cdk/lib/config.ts`、`cdk/lib/stack-pipeline.ts`、`cdk/lib/stack-static-site.ts`、`cdk/lib/stage-app.ts` を削除する（新しいパスに移動するため）
    - _Requirements: 8.1, 9.5, 10.5_

  - [x] 1.2 設定ファイル config.ts の作成
    - `cdk/lib/pipeline/config.ts` を作成する
    - `projectName`、`region`、`drRegion`、`stages`、`accounts`、`sourceBucket`、`parameterStore` を定義する
    - `as const` アサーションで型安全性を確保する
    - `StageName` 型を export する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. リソーススタックの実装
  - [x] 2.1 東京リージョン用リソーススタックの作成
    - `cdk/lib/resources/tokyo/stack-resource-tokyo.ts` を新規作成する
    - `TokyoResourceStack` クラスと `TokyoResourceStackProps` インターフェースを定義する
    - サンプル S3 バケット（`s3-{pj}-{stage}-sample`）を作成する
    - サンプル SQS キュー（`sqs-{pj}-{stage}-sample`）を作成する
    - リソース名にステージ名を含めて環境ごとに識別可能にする
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.2 大阪リージョン（DR）用リソーススタックの作成
    - `cdk/lib/resources/osaka/stack-resource-osaka.ts` を新規作成する
    - `OsakaResourceStack` クラスと `OsakaResourceStackProps` インターフェースを定義する
    - DR 用 S3 バケット（`s3-{pj}-{stage}-dr`）を作成する（バージョニング有効、ライフサイクルルール付き）
    - 東京リージョンとは異なる独自の構成を実装する
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. パイプライン基盤の実装
  - [x] 3.1 App_Stage の作成
    - `cdk/lib/pipeline/stage-app.ts` を作成する
    - `AppStage` クラスと `AppStageProps` インターフェースを定義する
    - 東京リージョン用の `TokyoResourceStack` と大阪リージョン用の `OsakaResourceStack` の両方をインスタンス化する
    - 各スタックに適切な `env`（account/region）と `stageName` を渡す
    - _Requirements: 2.4, 10.1, 10.3, 10.4_

  - [x] 3.2 Pipeline_Stack の作成
    - `cdk/lib/pipeline/stack-pipeline.ts` を作成する
    - `PipelineStack` クラスを定義する
    - S3 Source Bucket をバージョニング有効で作成する
    - `CodePipelineSource.s3()` でソースを設定する
    - `crossAccountKeys: true` を設定する
    - Synth Step で `cd cdk && npm ci && npx cdk synth` を実行し、`cdk/cdk.out` を出力ディレクトリとする
    - Parameter Store から Dev/Prd の account-id と region を取得する
    - Dev_Stage と Prd_Stage を追加し、Prd_Stage に `ManualApprovalStep` を設定する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 5.1, 5.2, 5.3, 6.1, 6.3, 7.1, 7.2, 7.3_

- [x] 4. チェックポイント - 基盤コンポーネントの確認
  - TypeScript のコンパイルが通ることを確認する（`npx tsc --noEmit`）
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. エントリポイントの実装
  - [x] 5.1 Pipeline_Deploy 用エントリポイントの作成
    - `cdk/bin/pipeline-app.ts` を作成する（既存の `bin/app.ts` があれば削除）
    - `PipelineStack` をインスタンス化し、Pipeline_Account の env を設定する
    - _Requirements: 4.1_

  - [x] 5.2 Direct_Deploy 用エントリポイントの作成
    - `cdk/bin/direct-app.ts` を新規作成する
    - コンテキスト値（`-c stage=dev`）または環境変数（`DEPLOY_STAGE`）からステージを取得する
    - Parameter Store から Target Account 情報を取得する
    - `TokyoResourceStack` と `OsakaResourceStack` を直接インスタンス化する
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 6.2, 6.3, 6.4_

  - [x] 5.3 cdk.json の更新
    - `cdk/cdk.json` の `app` エントリを `npx ts-node --prefer-ts-exts bin/pipeline-app.ts` に変更する
    - Direct_Deploy は `--app "npx ts-node --prefer-ts-exts bin/direct-app.ts"` で起動する想定
    - _Requirements: 4.1, 4.2_

- [x] 6. 最終チェックポイント - 全体の整合性確認
  - `npx tsc --noEmit` でコンパイルエラーがないことを確認する
  - `npx cdk synth --app "npx ts-node --prefer-ts-exts bin/pipeline-app.ts"` が成功することを確認する（Parameter Store のダミー値を許容）
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 本プロジェクトは IaC（Infrastructure as Code）プロジェクトのため、プロパティベーステストは適用しない
- 既存ファイル（`cdk/lib/config.ts`、`cdk/lib/stack-pipeline.ts`、`cdk/lib/stage-app.ts`）は新しいディレクトリ構造に移行するため削除後に新規作成する
- `cdk/lib/stack-static-site.ts` は本プロジェクトでは不要のため削除する
- Parameter Store のパラメータは事前に Pipeline_Account に手動作成する想定（CDK の外部で管理）
- クロスアカウントデプロイのため、Target_Account では事前に `cdk bootstrap --trust PIPELINE_ACCOUNT_ID` の実行が必要
- 大阪リージョン（ap-northeast-3）でも `cdk bootstrap` が必要

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] }
  ]
}
```
