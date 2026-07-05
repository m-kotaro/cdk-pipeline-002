# CloudFormation Templates

CDK Pipelines で利用する事前リソースを管理する。

## pipeline-buckets.yaml

CDK Pipelines で利用する S3 バケットを作成する。環境・リージョンごとに実行して独立したバケットセットを作成する。

- **SourceBucket** – パイプラインのソースバケット。EventBridge 通知を有効にしてパイプラインをトリガーする。
- **ArtifactBucket** – CodePipeline のアーティファクト出力バケット。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| ProjectName | プロジェクト名 | cp002 |
| Env | 環境コード (例: dev, stg, prd) | - |
| RegionName | リージョン名 (例: tokyo, osaka) | - |

### デプロイ

```bash
export PROJECT_NAME=cp002
export ENV=dev
export REGION_NAME=tokyo

aws cloudformation deploy \
  --stack-name stack-${PROJECT_NAME}-${ENV}-${REGION_NAME}-pipeline-buckets \
  --template-file cfn/pipeline-buckets.yaml \
  --parameter-overrides \
    ProjectName=${PROJECT_NAME} \
    Env=${ENV} \
    RegionName=${REGION_NAME}
```

Env と RegionName の値を変えるだけで別環境・別リージョン用のバケットセットが作成できる。

---

## parameter-store.yaml

アカウント情報を Parameter Store に保存する。環境ごとに実行する。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| ProjectName | プロジェクト名 | cp002 |
| Env | 環境コード (例: dev, stg, prd) | - |
| PipelineAccountId | Pipeline Account ID (CDK Pipelines がデプロイされるアカウント) | - |
| TargetAccountId | デプロイ先 AWS アカウント ID | - |

### デプロイ

```bash
export PROJECT_NAME=cp002

aws cloudformation deploy \
  --stack-name stack-${PROJECT_NAME}-dev-param \
  --template-file cfn/parameter-store.yaml \
  --parameter-overrides \
    ProjectName=${PROJECT_NAME} \
    Env=dev \
    PipelineAccountId=111111111111 \
    TargetAccountId=123456789012
```

環境コードを変えることで、任意の環境用パラメータを追加できる。
---

## CDK Pipeline デプロイ

上記の事前リソースを作成した後、CDK Pipeline をデプロイする。

### 前提条件

- Pipeline_Account で `cdk bootstrap` 済みであること
- クロスアカウントの場合: Target_Account で `cdk bootstrap --trust PIPELINE_ACCOUNT_ID` 済みであること
- AWS SSO でログイン済みであること（`aws sso login`）

### デプロイ（Pipeline 経由 - Tokyo のみ）

```bash
cd cdk

# AWS 認証情報のエクスポート（SSO 利用時に必須）
eval $(aws configure export-credentials --format env)
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export DEPLOY_ENV=dev
export DEPLOY_REGION=tokyo

# Pipeline Stack のデプロイ
npx cdk deploy --all
```

### Direct Deploy（任意のリージョン）

S3 アップロードを介さず直接リソースをデプロイする場合:

```bash
cd cdk

eval $(aws configure export-credentials --format env)
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export DEPLOY_ENV=dev
export DEPLOY_REGION=osaka  # tokyo or osaka

npx cdk deploy --all --app "npx ts-node --prefer-ts-exts bin/direct-app.ts"
```
