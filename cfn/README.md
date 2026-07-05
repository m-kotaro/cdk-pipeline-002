# CloudFormation Templates

CDK Pipelines で利用する事前リソースを管理する。

## source-bucket.yaml

CDK Pipelines のソースとなる S3 バケットを作成する。EventBridge 通知を有効にしてパイプラインをトリガーする。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| ProjectName | プロジェクト名 | cp002 |

### デプロイ

```bash
export PROJECT_NAME=cp002

aws cloudformation deploy \
  --stack-name stack-${PROJECT_NAME}-source-bucket \
  --template-file cfn/source-bucket.yaml \
  --parameter-overrides \
    ProjectName=${PROJECT_NAME}
```

---

## parameter-store.yaml

デプロイ先アカウント情報を Parameter Store に保存する。環境ごとに実行する。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| ProjectName | プロジェクト名 | cp002 |
| Env | 環境コード (dev / prd) | - |
| TargetAccountId | デプロイ先 AWS アカウント ID | - |
| TargetRegion | デプロイ先リージョン | ap-northeast-1 |

### デプロイ

dev 環境:

```bash
export PROJECT_NAME=cp002

aws cloudformation deploy \
  --stack-name stack-${PROJECT_NAME}-param-dev \
  --template-file cfn/parameter-store.yaml \
  --parameter-overrides \
    ProjectName=${PROJECT_NAME} \
    Env=dev \
    TargetAccountId=123456789012 \
    TargetRegion=ap-northeast-1
```

prd 環境:

```bash
aws cloudformation deploy \
  --stack-name stack-${PROJECT_NAME}-param-prd \
  --template-file cfn/parameter-store.yaml \
  --parameter-overrides \
    ProjectName=${PROJECT_NAME} \
    Env=prd \
    TargetAccountId=987654321098 \
    TargetRegion=ap-northeast-1
```
