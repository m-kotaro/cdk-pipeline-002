# Change Log

Spec ドキュメント（requirements.md, design.md, tasks.md）はまだ古い状態。以下の変更を追って反映する必要がある。

## 2026-07-05: Architecture Simplification

### マルチステージ → シングル環境パイプラインに変更
- **Before**: 1パイプラインで Dev→手動承認→Prd の2ステージデプロイ
- **After**: 1パイプライン = 1環境 = 1リージョン
- 環境コードを変えることで別パイプラインを独立して作成
- 手動承認ステップは削除

### config.ts 廃止 → 環境変数ベースに変更
- **Before**: `config.ts` にプロジェクト名、環境、リージョン、アカウント情報をハードコード
- **After**: `env.ts` で環境変数から全て取得
  - `PROJECT_NAME` (default: cp002)
  - `DEPLOY_ENV` (default: dev)
  - `DEPLOY_REGION` (default: tokyo)
  - `CDK_DEFAULT_ACCOUNT` (AWS認証情報から取得)
- アカウントIDは Parameter Store から取得（機密保持のため）

### リージョン名を命名規則に追加
- **Before**: `stack-cp002-dev-pipeline`, `s3-cp002-dev-source`
- **After**: `stack-cp002-dev-tokyo-pipeline`, `s3-cp002-dev-tokyo-source`
- `DEPLOY_REGION` に `tokyo` or `osaka` を指定

### クロスリージョンデプロイ廃止
- **Before**: 1パイプライン内で東京＋大阪の両リージョンにデプロイ（CDK Pipelines のクロスリージョンサポートスタック自動作成）
- **After**: パイプラインは東京のみ。大阪は Direct Deploy で手動管理
- 理由: クロスリージョンだとサポートスタック（レプリケーションバケット）が自動作成され、大阪リージョンの bootstrap が必要になる等、複雑化するため

### AppStage の変更
- **Before**: Tokyo_Stack + Osaka_Stack の両方をインスタンス化
- **After**: `DEPLOY_REGION` に応じてどちらか1つだけインスタンス化

### S3 ソースバケットの管理
- **Before**: CDK 内で S3 バケットを作成
- **After**: CFn テンプレート（`cfn/pipeline-buckets.yaml`）で事前作成し、CDK からは `fromBucketName` で参照
- EventBridge 通知は CFn テンプレート側で有効化

### EventBridge トリガー
- **Before**: `S3Trigger.EVENTS` 指定のみ（CDK が自動でルール作成する想定）
- **After**: `fromBucketName` だと自動作成されないため、CDK 内で EventBridge Rule を明示的に作成
- `pipeline.buildPipeline()` を呼んでから `events.Rule` を追加

### crossAccountKeys の条件分岐
- **Before**: `crossAccountKeys: true` 固定
- **After**: `this.account !== targetAccountId` で判定。同一アカウントなら `false`
- 理由: 同一アカウントで `crossAccountKeys: true` だと KMS キーポリシーエラーが発生する

### Parameter Store の簡素化
- **Before**: `pipeline-account-id`, `target-account-id`, `region` の3パラメータ
- **After**: `pipeline-account-id`, `target-account-id` の2パラメータのみ
- `region` は削除（パイプラインがそのリージョンで動くから自明）

### ソースオブジェクトキー
- `source.zip` → `cdk-pipeline-002-main.zip` に変更
- Synth Step のパス: `cd cdk-pipeline-002-main/cdk`（zip展開後のフォルダ構造に合わせて）

### SSO 認証の手順
- `aws sso login` → `eval $(aws configure export-credentials --format env)` で認証情報をエクスポート
- 再ログイン時は `unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN` が必要

## TODO: Spec ドキュメント更新
- [ ] requirements.md を最終実装に合わせて書き直す
- [ ] design.md のアーキテクチャ図・コード例を最終実装に合わせて書き直す
- [ ] tasks.md を削除または完了マークにする
