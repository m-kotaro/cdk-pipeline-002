# Requirements Document

## Introduction

AWS CDK Pipelines を使用したクロスアカウントデプロイのサンプルプロジェクト。「1パイプライン＝1環境」のアーキテクチャを採用し、config の環境コード（env）を変更するだけで独立したパイプラインを環境ごとに作成できる。S3 バケットをソースとして CDK Pipelines を実行し、指定された環境の AWS アカウントへリソースをデプロイする。開発効率のため、CDK Pipelines 経由のデプロイと `cdk deploy` コマンドによる直接デプロイの2つのエントリポイントを提供する。デプロイ先アカウント情報は AWS Systems Manager Parameter Store から取得する。

## Glossary

- **Pipeline_Stack**: CDK Pipelines を使用して CI/CD パイプラインを定義するスタック。Pipeline_Account にデプロイされる
- **App_Stage**: Pipeline 内のデプロイステージを表す CDK Stage コンストラクト
- **Resource_Stack**: デプロイ対象の AWS リソースを定義するスタック（Target_Account にデプロイされる）
- **Pipeline_Account**: CDK Pipelines がデプロイされる AWS アカウント（管理アカウント）
- **Target_Account**: リソースがデプロイされる先の AWS アカウント（環境ごとに異なる）
- **Source_Bucket**: CDK Pipelines のソースアーティファクトを格納する S3 バケット（Pipeline_Account に存在）
- **Artifact_Bucket**: CodePipeline のアーティファクト出力バケット（Pipeline_Account に存在）
- **Parameter_Store**: デプロイ先アカウント情報を保持する AWS Systems Manager Parameter Store
- **Direct_Deploy**: `cdk deploy` コマンドによる Target_Account への直接デプロイ
- **Pipeline_Deploy**: CDK Pipelines 経由での Target_Account へのクロスアカウントデプロイ
- **EnvName**: 環境コード（例: dev, stg, prd）。config.env で指定し、パイプラインのターゲットを決定する
- **Synth_Step**: CDK アプリケーションをシンセサイズするビルドステップ
- **Tokyo_Stack**: 東京リージョン（ap-northeast-1）にデプロイされるリソーススタック
- **Osaka_Stack**: 大阪リージョン（ap-northeast-3）にデプロイされる災害対策用リソーススタック。東京とは異なる構成を持つ

## Requirements

### Requirement 1: S3 ソースによるパイプライントリガー

**User Story:** As a 開発者, I want S3 バケットへのアーティファクトアップロードをトリガーにパイプラインを起動したい, so that GitHub CodeConnection に依存せずにパイプラインを実行できる

#### Acceptance Criteria

1. THE Pipeline_Stack SHALL Source_Bucket を既存バケットとして参照し、パイプラインのソースとして設定する
2. WHEN Source_Bucket にアーティファクトがアップロードされた場合, THE Pipeline_Stack SHALL EventBridge 経由でパイプラインの実行を開始する
3. THE Pipeline_Stack SHALL Source_Bucket のバケット名を設定ファイルから取得する

### Requirement 2: 1パイプライン＝1環境のクロスアカウントデプロイ

**User Story:** As a 開発者, I want 環境コードを変えるだけで独立したパイプラインを作成したい, so that 環境ごとにパイプラインを分離して安全にデプロイできる

#### Acceptance Criteria

1. THE Pipeline_Stack SHALL config.env で指定された1つの環境のみにデプロイする
2. THE Pipeline_Stack SHALL Parameter_Store から対象環境のアカウント ID とリージョンを取得する
3. THE App_Stage SHALL Tokyo_Stack と Osaka_Stack の両方をインスタンス化する
4. THE Pipeline_Stack SHALL CDK Pipelines の crossAccountKeys を有効にしてクロスアカウントデプロイをサポートする
5. THE Pipeline_Stack SHALL パイプライン名に環境コードを含める（cp-{pj}-{env}-deploy）

### Requirement 3: 設定の集中管理

**User Story:** As a 開発者, I want プロジェクト設定を一箇所で管理したい, so that 環境コードを変更するだけで別環境用のパイプラインが作れる

#### Acceptance Criteria

1. THE 設定ファイル SHALL env プロパティで環境コードを定義する
2. THE 設定ファイル SHALL プロジェクト名、リージョン、DR リージョンを含む
3. THE 設定ファイル SHALL Pipeline_Account と Target_Account のアカウント情報を含む
4. THE 設定ファイル SHALL Source_Bucket と Artifact_Bucket のバケット名を含む
5. THE 設定ファイル SHALL Parameter_Store のパラメータ名プレフィックスを含む
6. THE 設定ファイル SHALL TypeScript の as const アサーションを使用して型安全性を確保する

### Requirement 4: デュアルエントリポイント

**User Story:** As a 開発者, I want CDK Pipelines 経由のデプロイと cdk deploy による直接デプロイの2つの方法を使い分けたい, so that 開発時は S3 アップロードの手間を省いて迅速にリソースを検証できる

#### Acceptance Criteria

1. THE CDK アプリケーション SHALL Pipeline_Deploy 用のエントリポイントを提供する（Pipeline_Stack をデプロイ）
2. THE CDK アプリケーション SHALL Direct_Deploy 用のエントリポイントを提供する（Resource_Stack を直接デプロイ）
3. WHEN Direct_Deploy が実行された場合, THE CDK アプリケーション SHALL Pipeline_Stack を経由せずに Target_Account へ Resource_Stack を直接デプロイする
4. THE Direct_Deploy SHALL config.env の環境コードを使用してデプロイ先を決定する

### Requirement 5: Parameter Store によるアカウント情報管理

**User Story:** As a 開発者, I want デプロイ先アカウントの情報を Parameter Store で管理したい, so that アカウント情報をコードにハードコードせずにセキュアに参照できる

#### Acceptance Criteria

1. THE Parameter_Store SHALL Target_Account のアカウント ID をパラメータとして保存する
2. THE Parameter_Store SHALL Target_Account のデプロイ先リージョンをパラメータとして保存する
3. THE Parameter_Store SHALL パラメータ名に環境コードを含む命名規則を使用する（/{pj}/{env}/account-id, /{pj}/{env}/region）
4. THE Parameter_Store SHALL Pipeline_Account の AWS Systems Manager に作成される

### Requirement 6: Parameter Store 参照によるデプロイ

**User Story:** As a 開発者, I want Pipeline_Deploy と Direct_Deploy の両方で Parameter Store からデプロイ先情報を取得したい, so that デプロイ先の変更が Parameter Store の更新だけで完結する

#### Acceptance Criteria

1. WHEN Pipeline_Deploy が実行された場合, THE Pipeline_Stack SHALL Parameter_Store からデプロイ先アカウント ID とリージョンを取得する
2. WHEN Direct_Deploy が実行された場合, THE CDK アプリケーション SHALL Parameter_Store からデプロイ先アカウント ID とリージョンを取得する
3. THE Pipeline_Deploy と Direct_Deploy SHALL 同一の Parameter_Store パラメータを参照する

### Requirement 7: CDK シンセサイズ

**User Story:** As a 開発者, I want パイプラインが CDK アプリケーションを自動的にシンセサイズしたい, so that デプロイ可能な CloudFormation テンプレートが生成される

#### Acceptance Criteria

1. WHEN パイプラインが実行された場合, THE Synth_Step SHALL cdk ディレクトリで npm ci を実行して依存関係をインストールする
2. WHEN 依存関係のインストールが完了した場合, THE Synth_Step SHALL npx cdk synth を実行して CloudFormation テンプレートを生成する
3. THE Synth_Step SHALL cdk/cdk.out をプライマリ出力ディレクトリとして指定する

### Requirement 8: サンプルリソースの定義（東京リージョン）

**User Story:** As a 開発者, I want Tokyo_Stack にシンプルなサンプルリソース（S3、SQS）を含めたい, so that クロスアカウントデプロイの動作を簡単に確認できる

#### Acceptance Criteria

1. THE Tokyo_Stack SHALL サンプルリソースとして S3 バケットを作成する
2. THE Tokyo_Stack SHALL サンプルリソースとして SQS キューを作成する
3. THE Tokyo_Stack SHALL リソース名に環境コードを含めて環境ごとに識別可能にする
4. THE Tokyo_Stack SHALL lib/resources/tokyo/ ディレクトリのリソース定義を使用する

### Requirement 9: 災害対策（DR）環境

**User Story:** As a 開発者, I want 東京リージョンとは別に大阪リージョンにも災害対策用リソースをデプロイしたい, so that 東京リージョンの障害時にも業務を継続できる

#### Acceptance Criteria

1. THE App_Stage SHALL 東京リージョン用の Tokyo_Stack と大阪リージョン用の Osaka_Stack の両方をインスタンス化する
2. THE Osaka_Stack SHALL 東京リージョンとは異なる独自のリソース構成を持つ
3. THE Tokyo_Stack と Osaka_Stack SHALL 同一の Target_Account 内の異なるリージョンにデプロイされる
4. THE Osaka_Stack SHALL ap-northeast-3 リージョンにデプロイされる
5. THE リソースディレクトリ SHALL tokyo/ と osaka/ にフォルダを分離して管理する
