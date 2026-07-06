# Requirements Document

## Introduction

AWS CDK Pipelines を使用したクロスアカウントデプロイのサンプルプロジェクト。「1パイプライン＝1環境＝1リージョン」のアーキテクチャを採用し、環境変数を変更するだけで独立したパイプラインを環境ごとに作成できる。S3 バケットをソースとして CDK Pipelines を実行し、指定された環境の AWS アカウントへリソースをデプロイする。開発効率のため、CDK Pipelines 経由のデプロイと `cdk deploy` コマンドによる直接デプロイの2つのエントリポイントを提供する。デプロイ先アカウント情報は AWS Systems Manager Parameter Store から取得し、コードにはアカウント ID をハードコードしない。

## Glossary

- **PipelineStack**: CDK Pipelines を使用して CI/CD パイプラインを定義するスタック。Pipeline_Account にデプロイされる
- **AppStage**: Pipeline 内のデプロイステージを表す CDK Stage コンストラクト
- **ResourceStack**: デプロイ対象の AWS リソースを定義するスタック（Target_Account にデプロイされる）
- **Pipeline_Account**: CDK Pipelines がデプロイされる AWS アカウント（管理アカウント）
- **Target_Account**: リソースがデプロイされる先の AWS アカウント（環境ごとに異なる可能性あり）
- **Source_Bucket**: CDK Pipelines のソースアーティファクトを格納する S3 バケット（Pipeline_Account に存在、CFn で事前作成）
- **Artifact_Bucket**: CodePipeline のアーティファクト出力バケット（CDK で作成、クロスアカウント時は KMS 暗号化）
- **Parameter_Store**: デプロイ先アカウント情報を保持する AWS Systems Manager Parameter Store
- **Direct_Deploy**: `cdk deploy` コマンドによる Target_Account への直接デプロイ
- **Pipeline_Deploy**: CDK Pipelines 経由での Target_Account へのデプロイ
- **deployEnv**: 環境コード（例: dev, prd）。環境変数 `DEPLOY_ENV` で指定
- **deployRegion**: リージョン名（例: tokyo, osaka）。環境変数 `DEPLOY_REGION` で指定
- **pipelineAccountCode**: パイプラインアカウントコード（例: base）。環境変数 `PIPELINE_ACCOUNT_CODE` で指定
- **targetAccountCode**: ターゲットアカウントコード（例: alfa, beta）。環境変数 `TARGET_ACCOUNT_CODE` で指定
- **Synth_Step**: CDK アプリケーションをシンセサイズするビルドステップ

## Requirements

### Requirement 1: S3 ソースによるパイプライントリガー

**User Story:** As a 開発者, I want S3 バケットへのアーティファクトアップロードをトリガーにパイプラインを起動したい, so that GitHub CodeConnection に依存せずにパイプラインを実行できる

#### Acceptance Criteria

1. THE PipelineStack SHALL Source_Bucket を既存バケットとして参照し、パイプラインのソースとして設定する
2. WHEN Source_Bucket にアーティファクトがアップロードされた場合, THE PipelineStack SHALL EventBridge Rule 経由でパイプラインの実行を開始する
3. THE Source_Bucket SHALL CFn テンプレート（`cfn/pipeline-buckets.yaml`）で事前作成される
4. THE Source_Bucket SHALL EventBridge 通知が有効化されている

### Requirement 2: 環境変数ベースの設定管理

**User Story:** As a 開発者, I want 環境変数を変えるだけで独立したパイプラインを作成したい, so that コードを変更せずに複数環境・複数アカウントに対応できる

#### Acceptance Criteria

1. THE env.ts SHALL 以下の環境変数から設定を取得する
   - `PROJECT_NAME` (default: cp002)
   - `DEPLOY_ENV` (default: dev)
   - `DEPLOY_REGION` (default: tokyo)
   - `PIPELINE_ACCOUNT_CODE` (default: base)
   - `TARGET_ACCOUNT_CODE` (default: alfa)
   - `CDK_DEFAULT_ACCOUNT`
2. THE env.ts SHALL 環境変数から派生値（バケット名、SSM プレフィックス等）を生成する
3. THE コード SHALL アカウント ID をハードコードしない

### Requirement 3: クロスアカウントデプロイ対応

**User Story:** As a 開発者, I want 同一アカウントでもクロスアカウントでもデプロイできるようにしたい, so that 開発環境と本番環境で同じコードを使える

#### Acceptance Criteria

1. THE PipelineStack SHALL `this.account !== targetAccountId` でクロスアカウント判定を行う
2. WHEN クロスアカウントの場合, THE PipelineStack SHALL KMS キーを作成し Artifact_Bucket を KMS 暗号化する
3. WHEN 同一アカウントの場合, THE PipelineStack SHALL S3 マネージド暗号化を使用する
4. THE PipelineStack SHALL `crossAccountKeys` を `isCrossAccount` に基づいて設定する
5. THE クロスアカウントデプロイ SHALL Target_Account で `cdk bootstrap --trust PIPELINE_ACCOUNT_ID` が実行済みであることを前提とする

### Requirement 4: デュアルエントリポイント

**User Story:** As a 開発者, I want CDK Pipelines 経由のデプロイと cdk deploy による直接デプロイの2つの方法を使い分けたい, so that 開発時は S3 アップロードの手間を省いて迅速にリソースを検証できる

#### Acceptance Criteria

1. THE CDK アプリケーション SHALL `pipeline-app.ts` で Pipeline_Deploy 用のエントリポイントを提供する
2. THE CDK アプリケーション SHALL `direct-app.ts` で Direct_Deploy 用のエントリポイントを提供する
3. THE `direct-app.ts` と `stage-app.ts` SHALL 同じデプロイ関数（`deployTokyo`, `deployOsaka`）を使用する
4. THE デプロイ関数 SHALL `Construct` を scope として受け取り、App と Stage の両方で使用可能にする

### Requirement 5: Parameter Store によるアカウント情報管理

**User Story:** As a 開発者, I want デプロイ先アカウントの情報を Parameter Store で管理したい, so that アカウント情報をコードにハードコードせずにセキュアに参照できる

#### Acceptance Criteria

1. THE Parameter_Store SHALL パラメータ名に環境コードとアカウントコードを含む命名規則を使用する
   - `/{pj}/{env}/{accountCode}/pipeline-account-id`
   - `/{pj}/{env}/{accountCode}/target-account-id`
2. THE Parameter_Store SHALL CFn テンプレート（`cfn/parameter-store.yaml`）で作成される
3. THE PipelineStack SHALL 環境変数 `TARGET_ACCOUNT_ID` がある場合はそちらを優先し、ない場合は `valueFromLookup` で Parameter_Store から取得する
4. THE Synth_Step SHALL 環境変数で `TARGET_ACCOUNT_ID` を渡し、CodeBuild 内での SSM 参照を回避する

### Requirement 6: 命名規則

**User Story:** As a 開発者, I want リソース名から環境・アカウント・リージョンを識別できるようにしたい, so that マルチアカウント環境でリソースを管理しやすい

#### Acceptance Criteria

1. THE Pipeline 系リソース SHALL 以下の命名規則に従う
   - PipelineStack: `stack-{pj}-{env}-{pipelineCode}-{region}-pipeline`
   - CodePipeline: `cp-{pj}-{env}-{pipelineCode}-{region}-deploy`
   - Source Bucket: `s3-{pj}-{env}-{pipelineCode}-{region}-source`
   - Artifact Bucket: `s3-{pj}-{env}-{pipelineCode}-{region}-artifact`
2. THE Resource 系リソース SHALL 以下の命名規則に従う
   - ResourceStack: `stack-{pj}-{env}-{targetCode}-{region}`
   - Sample S3: `s3-{pj}-{env}-{targetCode}-sample`
   - Sample SQS: `sqs-{pj}-{env}-{targetCode}-sample`

### Requirement 7: CDK シンセサイズ

**User Story:** As a 開発者, I want パイプラインが CDK アプリケーションを自動的にシンセサイズしたい, so that デプロイ可能な CloudFormation テンプレートが生成される

#### Acceptance Criteria

1. THE Synth_Step SHALL 環境変数（`PROJECT_NAME`, `DEPLOY_ENV`, `DEPLOY_REGION`, `PIPELINE_ACCOUNT_CODE`, `TARGET_ACCOUNT_CODE`, `TARGET_ACCOUNT_ID`）を設定する
2. THE Synth_Step SHALL `npm ci` を実行して依存関係をインストールする
3. THE Synth_Step SHALL `npx cdk synth` を実行して CloudFormation テンプレートを生成する
4. THE Synth_Step SHALL プライマリ出力ディレクトリを適切に指定する

### Requirement 8: サンプルリソースの定義

**User Story:** As a 開発者, I want ResourceStack にシンプルなサンプルリソースを含めたい, so that クロスアカウントデプロイの動作を簡単に確認できる

#### Acceptance Criteria

1. THE TokyoResourceStack SHALL サンプルリソースとして S3 バケットと SQS キューを作成する
2. THE OsakaResourceStack SHALL DR 用として S3 バケット（バージョニング有効）を作成する
3. THE ResourceStack SHALL リソース名に環境コードとアカウントコードを含めて識別可能にする

### Requirement 9: セキュリティ要件

**User Story:** As a 開発者, I want 機密情報が Git にコミットされないようにしたい, so that セキュリティリスクを低減できる

#### Acceptance Criteria

1. THE `.gitignore` SHALL `cdk.context.json` を除外する（アカウント ID がキャッシュされるため）
2. THE `.gitignore` SHALL `cdk.out/` を除外する
3. THE コード SHALL アカウント ID を環境変数または Parameter Store から動的に取得する
4. THE README SHALL アカウント ID の例示に実際の値を使用しない

## Deploy Scenarios

| # | Scene | Trigger | Scope | Account |
|---|-------|---------|-------|---------|
| 1 | Dev - Initial | `cdk deploy` (terminal) | Pipeline + Resources | Same account |
| 2 | Dev - Daily | `cdk deploy --app direct-app.ts` | Resources only | Same account |
| 3 | Dev - Pipeline trigger | Upload zip to S3 | Pipeline + Resources | Same account |
| 4 | Prd - Initial | `cdk deploy` (terminal) | Pipeline + Resources | Cross-account |
| 5 | Prd - Pipeline trigger | Upload zip to S3 | Pipeline + Resources | Cross-account |
