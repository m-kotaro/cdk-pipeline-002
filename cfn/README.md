# CloudFormation Templates

CDK Pipeline で利用する事前リソースを管理する。

## codeconnection.yaml

GitHub との CodeConnection を作成する。デプロイ後に AWS Console で手動承認が必要。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| ProjectName | プロジェクト名 | cp001 |

### デプロイ

```bash
export PROJECT_NAME=cp001

aws cloudformation create-stack \
  --stack-name stack-${PROJECT_NAME}-codeconnection \
  --template-body file://cfn/codeconnection.yaml \
  --parameters \
    ParameterKey=ProjectName,ParameterValue=${PROJECT_NAME}
```

### デプロイ後の手順

1. AWS Console → CodePipeline → 設定 → 接続 を開く
2. 作成された接続（`codeconnection-dev-cdk-pipeline-001-github`）を選択
3. 「保留中の接続を更新」から GitHub OAuth 認証を完了する
4. ステータスが `Available` になれば OK

---

## hostedzone.yaml

環境ごとのサブドメインホストゾーンを作成する（`dev.example.com` / `prd.example.com`）。

### Parameters

| Name | Description | Default |
|------|-------------|---------|
| Env | 環境コード (dev / prd) | - |
| DomainName | ルートドメイン名 | - |
| ProjectName | プロジェクト名 | cp001 |

### デプロイ

```bash
export ENV=[dev|prd]
export PROJECT_NAME=cp001
export DOMAIN_NAME=example.com

aws cloudformation create-stack \
  --stack-name stack-${PROJECT_NAME}-${ENV}-hostedzone \
  --template-body file://cfn/hostedzone.yaml \
  --parameters \
    ParameterKey=Env,ParameterValue=${ENV} \
    ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME} \
    ParameterKey=ProjectName,ParameterValue=${PROJECT_NAME}
```

### デプロイ後の手順

1. スタック出力の `NameServers` を確認する
2. 親ゾーン（ルートドメインのレジストラ or 親ホストゾーン）に NS レコードを設定する
   - `dev.example.com` → 出力された4つの NS レコード
   - `prd.example.com` → 出力された4つの NS レコード
