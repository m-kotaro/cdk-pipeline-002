# Change Log

## 2026-07-06: アカウントコード追加 & クロスアカウント対応完了

### アカウントコードの追加
- **新規環境変数**: `PIPELINE_ACCOUNT_CODE`, `TARGET_ACCOUNT_CODE`
- マルチアカウント環境でリソースを識別しやすくするため
- 命名規則: `stack-{pj}-{env}-{accountCode}-{region}-xxx`

### クロスアカウントデプロイ対応
- KMS キーの自動作成（クロスアカウント時のみ）
- `isCrossAccount` フラグで同一アカウント/クロスアカウントを判定
- Artifact Bucket の暗号化を KMS に変更（クロスアカウント時）

### CodeBuild での SSM 参照問題の解決
- 環境変数 `TARGET_ACCOUNT_ID` を Synth Step で渡す
- CodeBuild 内で再度 SSM を参照しないように変更
- `process.env.TARGET_ACCOUNT_ID || valueFromLookup()` のフォールバック

### デプロイ関数の共通化
- `deploy-tokyo.ts`, `deploy-osaka.ts` を各リージョンフォルダに配置
- `direct-app.ts` と `stage-app.ts` で同じ関数を使用
- scope の型を `Construct` に変更して App/Stage 両方で使えるように

### cdk.context.json の除外
- `.gitignore` に追加
- アカウント ID がキャッシュされる問題を回避

### Spec ドキュメント更新
- [x] design.md を最終実装に合わせて書き直し

---

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
- **After**: `stack-cp002-dev-base-tokyo-pipeline`, `s3-cp002-dev-base-tokyo-source`
- `DEPLOY_REGION` に `tokyo` or `osaka` を指定

### クロスリージョンデプロイ廃止
- **Before**: 1パイプライン内で東京＋大阪の両リージョンにデプロイ
- **After**: パイプラインはリージョン単位。大阪は別パイプラインまたは Direct Deploy
- 理由: クロスリージョンだとサポートスタックが自動作成され複雑化するため

### AppStage の変更
- **Before**: Tokyo_Stack + Osaka_Stack の両方をインスタンス化
- **After**: `DEPLOY_REGION` に応じてどちらか1つだけインスタンス化

### S3 ソースバケットの管理
- **Before**: CDK 内で S3 バケットを作成
- **After**: CFn テンプレート（`cfn/pipeline-buckets.yaml`）で事前作成

### EventBridge トリガー
- CDK 内で EventBridge Rule を明示的に作成
- `pipeline.buildPipeline()` を呼んでから `events.Rule` を追加

### crossAccountKeys の条件分岐
- `this.account !== targetAccountId` で判定
- 同一アカウントなら `false`（KMS キーポリシーエラー回避）

### Parameter Store の構造
- パス: `/{pj}/{env}/{accountCode}/target-account-id`
- アカウントコードを含めた階層構造

### ソースオブジェクトキー
- `cdk-pipeline-002-main.zip` に固定
- Synth Step のパス: `cd cdk-pipeline-002-main/cdk`
