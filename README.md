# cdk-pipeline-002

AWS CDK Pipelines を使用したクロスアカウントデプロイのサンプルプロジェクト。

## Deploy Scenarios

| # | Scene | Trigger | Scope | Account |
|---|-------|---------|-------|---------|
| 1 | Dev - Initial | `cdk deploy` (terminal) | Pipeline + Resources | Same account |
| 2 | Dev - Daily | `cdk deploy` (terminal, direct-app) | Resources only | Same account |
| 3 | Dev - Pipeline trigger | Upload zip to S3 | Pipeline + Resources | Same account |
| 4 | Prd - Initial | `cdk deploy` (terminal) | Pipeline + Resources | Cross-account (Pipeline → Target) |
| 5 | Prd - Pipeline trigger | Upload zip to S3 | Pipeline + Resources | Cross-account (Pipeline → Target) |

## Commands

### Prerequisites

```bash
# Clear stale credentials (SSO re-login後に必要)
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

# SSO login
aws login

# Export credentials
eval $(aws configure export-credentials --format env)
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# Verify login
aws sts get-caller-identity

# Project settings
export PROJECT_NAME=cp002
export DEPLOY_ENV=dev
export DEPLOY_REGION=tokyo
export PIPELINE_ACCOUNT_CODE=base
export TARGET_ACCOUNT_CODE=alfa
```

### 1. Dev - Initial (Pipeline + Resources)

```bash
cd cdk
npx cdk deploy --all
```

### 2. Dev - Daily (Resources only)

```bash
cd cdk
npx cdk deploy --all --app "npx ts-node --prefer-ts-exts bin/direct-app.ts"
```

### 3. Dev - Pipeline trigger

```bash
# Upload source zip to S3
aws s3 cp cdk-pipeline-002-main.zip s3://s3-cp002-dev-base-tokyo-source/
```

### 4. Prd - Initial (Cross-account)

```bash
export DEPLOY_ENV=prd
export DEPLOY_REGION=tokyo

cd cdk
npx cdk deploy --all
```

### 5. Prd - Pipeline trigger

```bash
aws s3 cp cdk-pipeline-002-main.zip s3://s3-cp002-prd-base-tokyo-source/
```

## Project Structure

```
cdk/
├── bin/
│   ├── pipeline-app.ts        # Pipeline deploy entry point
│   └── direct-app.ts          # Direct deploy entry point (Resources only)
├── lib/
│   ├── pipeline/
│   │   ├── env.ts             # Environment variables resolution
│   │   ├── stack-pipeline.ts  # Pipeline Stack
│   │   └── stage-app.ts       # App Stage
│   └── resources/
│       ├── tokyo/             # Tokyo region resources
│       │   └── stack-resource-tokyo.ts
│       └── osaka/             # Osaka (DR) resources
│           └── stack-resource-osaka.ts
cfn/
├── pipeline-buckets.yaml      # S3 buckets (source + artifact)
├── parameter-store.yaml       # SSM Parameter Store (account IDs)
└── README.md                  # CFn deploy instructions
```

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PROJECT_NAME` | Project name | cp002 | cp002 |
| `DEPLOY_ENV` | Environment code | dev | dev, prd |
| `DEPLOY_REGION` | Region name | tokyo | tokyo, osaka |
| `CDK_DEFAULT_ACCOUNT` | AWS Account ID | - | 687848809039 |
| `PIPELINE_ACCOUNT_CODE` | Pipeline account code (free-form) | base | base, main |
| `TARGET_ACCOUNT_CODE` | Target account code (free-form) | alfa | alfa, beta, gamma |

## Naming Convention

リソース名にアカウントコードを含めることで、マルチアカウント環境でも識別しやすくなる。

| Resource Type | Pattern | Example |
|---------------|---------|---------|
| Pipeline Stack | `stack-{pj}-{env}-{pipelineCode}-{region}-pipeline` | `stack-cp002-dev-base-tokyo-pipeline` |
| CodePipeline | `cp-{pj}-{env}-{pipelineCode}-{region}-deploy` | `cp-cp002-dev-base-tokyo-deploy` |
| Source Bucket | `s3-{pj}-{env}-{pipelineCode}-{region}-source` | `s3-cp002-dev-base-tokyo-source` |
| Artifact Bucket | `s3-{pj}-{env}-{pipelineCode}-{region}-artifact` | `s3-cp002-dev-base-tokyo-artifact` |
| Resource Stack | `stack-{pj}-{env}-{targetCode}-{region}` | `stack-cp002-dev-alfa-tokyo` |
| Sample S3 | `s3-{pj}-{env}-{targetCode}-sample` | `s3-cp002-dev-alfa-sample` |
| Sample SQS | `sqs-{pj}-{env}-{targetCode}-sample` | `sqs-cp002-dev-alfa-sample` |
| DR S3 | `s3-{pj}-{env}-{targetCode}-dr` | `s3-cp002-dev-alfa-dr` |
