# 設計ドキュメント: CDK Pipeline Sample

## Overview

本プロジェクトは、AWS CDK Pipelines を使用したクロスアカウントデプロイのサンプル実装である。「1パイプライン＝1環境」のアーキテクチャを採用し、config の環境コード（env）を変更するだけで独立したパイプラインを環境ごとに作成できる。

S3 バケットをソースとしたパイプライン実行により、Pipeline_Account から指定された Target_Account へリソースをデプロイする。各環境のパイプラインでは東京リージョン（ap-northeast-1）と大阪リージョン（ap-northeast-3）の両方にリソースをデプロイし、大阪リージョンは災害対策（DR）用として東京とは異なるリソース構成を持つ。

開発効率向上のため、パイプライン経由（Pipeline_Deploy）と `cdk deploy` コマンドによる直接デプロイ（Direct_Deploy）の2つのエントリポイントを提供する。

デプロイ先アカウント情報は Pipeline_Account の AWS Systems Manager Parameter Store で一元管理し、両方のデプロイパスから同一のパラメータを参照する設計とする。

## Architecture

### 全体アーキテクチャ図（1パイプライン＝1環境）

```mermaid
graph TB
    subgraph Pipeline_Account["Pipeline_Account（管理アカウント）"]
        S3Source["S3 Source Bucket<br/>s3-{pj}-{env}-source"]
        S3Artifact["S3 Artifact Bucket<br/>s3-{pj}-{env}-artifact"]
        SSM["Parameter Store<br/>/{pj}/{env}/account-id<br/>/{pj}/{env}/region"]
        CP["CodePipeline<br/>cp-{pj}-{env}-deploy"]
        Synth["Synth Step<br/>npm ci → cdk synth"]
        Deploy["Deploy Stage"]
    end

    subgraph Target_Account["Target_Account（対象環境）"]
        subgraph Tokyo["ap-northeast-1（東京）"]
            S3Sample["S3 Bucket<br/>s3-{pj}-{env}-sample"]
            SQSSample["SQS Queue<br/>sqs-{pj}-{env}-sample"]
        end
        subgraph Osaka["ap-northeast-3（大阪 / DR）"]
            DrS3["S3 Bucket<br/>s3-{pj}-{env}-dr"]
        end
    end

    S3Source -->|"アーティファクト<br/>アップロード"| CP
    CP --> Synth
    Synth --> Deploy
    Deploy -->|"cross-account deploy"| Tokyo
    Deploy -->|"cross-account deploy"| Osaka
    SSM -.->|"参照"| CP
```

### 2つのデプロイパス

```mermaid
graph LR
    subgraph Pipeline_Deploy["Pipeline_Deploy（S3ソース経由）"]
        direction TB
        PA1["pipeline-app.ts"]
        PS["Pipeline_Stack"]
        AS1["App_Stage(Deploy)"]
        TK1["Tokyo_Stack"]
        OS1["Osaka_Stack"]

        PA1 --> PS
        PS --> AS1
        AS1 --> TK1
        AS1 --> OS1
    end

    subgraph Direct_Deploy["Direct_Deploy（cdk deploy 経由）"]
        direction TB
        DA["direct-app.ts"]
        TK2["Tokyo_Stack"]
        OS2["Osaka_Stack"]

        DA --> TK2
        DA --> OS2
    end

    subgraph SSM["Parameter Store"]
        P1["/{pj}/{env}/account-id"]
        P2["/{pj}/{env}/region"]
    end

    PS -.->|"参照"| SSM
    DA -.->|"参照"| SSM
```

### 環境ごとのパイプライン作成

```mermaid
graph TD
    Config["config.ts<br/>env = 'dev'"]
    ConfigPrd["config.ts<br/>env = 'prd'"]

    Config --> DevPipeline["stack-cp002-dev-pipeline<br/>cp-cp002-dev-deploy"]
    ConfigPrd --> PrdPipeline["stack-cp002-prd-pipeline<br/>cp-cp002-prd-deploy"]

    DevPipeline --> DevTarget["Dev Target_Account"]
    PrdPipeline --> PrdTarget["Prd Target_Account"]
```

config.env の値を変更してデプロイするだけで、環境ごとに完全に独立したパイプラインが作成される。

## Components and Interfaces

### ファイル構成

```
cdk/
├── bin/
│   ├── pipeline-app.ts        # Pipeline_Deploy エントリポイント
│   └── direct-app.ts          # Direct_Deploy エントリポイント
├── lib/
│   ├── pipeline/              # パイプライン基盤（初期構築後ほぼ変更しない）
│   │   ├── config.ts          # プロジェクト設定（集中管理）
│   │   ├── stack-pipeline.ts  # Pipeline_Stack 定義
│   │   └── stage-app.ts       # App_Stage 定義
│   └── resources/             # デプロイ対象リソース（開発者が日常的に追加・修正）
│       ├── tokyo/             # 東京リージョン用リソース
│       │   └── stack-resource-tokyo.ts
│       └── osaka/             # 大阪リージョン（DR）用リソース
│           └── stack-resource-osaka.ts
├── cdk.json
├── package.json
└── tsconfig.json
```

### コンポーネント詳細

#### 1. config.ts（設定の集中管理）

```typescript
export const config = {
  projectName: "cp002",
  env: "dev",  // 環境コード: この値を変えることで別環境用のパイプラインが作れる
  region: "ap-northeast-1",
  drRegion: "ap-northeast-3",
  accounts: {
    pipeline: { id: "PIPELINE_ACCOUNT_ID", alias: "pipeline" },
    target: { id: "TARGET_ACCOUNT_ID", alias: "target" },
  },
  sourceBucket: { name: "s3-cp002-dev-source" },
  artifactBucket: { name: "s3-cp002-dev-artifact" },
  parameterStore: { prefix: "/cp002" },
} as const;

export type EnvName = typeof config.env;
```

#### 2. pipeline-app.ts（Pipeline_Deploy エントリポイント）

```typescript
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PipelineStack } from "../lib/pipeline/stack-pipeline";
import { config } from "../lib/pipeline/config";

const app = new cdk.App();

new PipelineStack(app, `stack-${config.projectName}-${config.env}-pipeline`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || config.accounts.pipeline.id,
    region: config.region,
  },
});

app.synth();
```

#### 3. direct-app.ts（Direct_Deploy エントリポイント）

```typescript
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { TokyoResourceStack } from "../lib/resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../lib/resources/osaka/stack-resource-osaka";
import { config } from "../lib/pipeline/config";

const app = new cdk.App();
const envName = config.env;

const targetAccountId = ssm.StringParameter.valueFromLookup(
  app, `${config.parameterStore.prefix}/${envName}/account-id`
);
const targetRegion = ssm.StringParameter.valueFromLookup(
  app, `${config.parameterStore.prefix}/${envName}/region`
);

new TokyoResourceStack(app, `stack-${config.projectName}-${envName}-tokyo`, {
  env: { account: targetAccountId, region: targetRegion },
  envName: envName,
  stackName: `stack-${config.projectName}-${envName}-tokyo`,
});

new OsakaResourceStack(app, `stack-${config.projectName}-${envName}-osaka`, {
  env: { account: targetAccountId, region: config.drRegion },
  envName: envName,
  stackName: `stack-${config.projectName}-${envName}-osaka`,
});

app.synth();
```

#### 4. stack-pipeline.ts（Pipeline_Stack）

```typescript
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { CodePipeline, CodePipelineSource, ShellStep } from "aws-cdk-lib/pipelines";
import { S3Trigger } from "aws-cdk-lib/aws-codepipeline-actions";
import { AppStage } from "./stage-app";
import { config } from "./config";

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pj = config.projectName;
    const env = config.env;

    const sourceBucket = s3.Bucket.fromBucketName(this, "SourceBucket", config.sourceBucket.name);
    const artifactBucket = s3.Bucket.fromBucketName(this, "ArtifactBucket", config.artifactBucket.name);

    const source = CodePipelineSource.s3(sourceBucket, "source.zip", {
      trigger: S3Trigger.EVENTS,
    });

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `cp-${pj}-${env}-deploy`,
      crossAccountKeys: true,
      artifactBucket: artifactBucket,
      synth: new ShellStep("Synth", {
        input: source,
        commands: ["cd cdk", "npm ci", "npx cdk synth"],
        primaryOutputDirectory: "cdk/cdk.out",
      }),
    });

    const targetAccountId = ssm.StringParameter.valueFromLookup(
      this, `${config.parameterStore.prefix}/${env}/account-id`
    );
    const targetRegion = ssm.StringParameter.valueFromLookup(
      this, `${config.parameterStore.prefix}/${env}/region`
    );

    pipeline.addStage(
      new AppStage(this, "Deploy", {
        env: { account: targetAccountId, region: targetRegion },
        envName: env,
      })
    );
  }
}
```

#### 5. stage-app.ts（App_Stage）

```typescript
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { TokyoResourceStack } from "../resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../resources/osaka/stack-resource-osaka";
import { config } from "./config";

export interface AppStageProps extends cdk.StageProps {
  envName: string;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const pj = config.projectName;
    const { envName } = props;

    new TokyoResourceStack(this, `stack-${pj}-${envName}-tokyo`, {
      env: { account: props.env?.account, region: config.region },
      envName: envName,
      stackName: `stack-${pj}-${envName}-tokyo`,
    });

    new OsakaResourceStack(this, `stack-${pj}-${envName}-osaka`, {
      env: { account: props.env?.account, region: config.drRegion },
      envName: envName,
      stackName: `stack-${pj}-${envName}-osaka`,
    });
  }
}
```

#### 6. stack-resource-tokyo.ts（Tokyo_Stack）

```typescript
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { config } from "../../pipeline/config";

export interface TokyoResourceStackProps extends cdk.StackProps {
  envName: string;
}

export class TokyoResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TokyoResourceStackProps) {
    super(scope, id, props);
    const pj = config.projectName;
    const { envName } = props;

    new s3.Bucket(this, "SampleBucket", {
      bucketName: `s3-${pj}-${envName}-sample`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new sqs.Queue(this, "SampleQueue", {
      queueName: `sqs-${pj}-${envName}-sample`,
      retentionPeriod: cdk.Duration.days(4),
    });
  }
}
```

#### 7. stack-resource-osaka.ts（Osaka_Stack / DR）

```typescript
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { config } from "../../pipeline/config";

export interface OsakaResourceStackProps extends cdk.StackProps {
  envName: string;
}

export class OsakaResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OsakaResourceStackProps) {
    super(scope, id, props);
    const pj = config.projectName;
    const { envName } = props;

    new s3.Bucket(this, "DrBucket", {
      bucketName: `s3-${pj}-${envName}-dr`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        { noncurrentVersionExpiration: cdk.Duration.days(90) },
      ],
    });
  }
}
```

## Data Models

### 設定データ構造

```typescript
interface Config {
  readonly projectName: string;
  readonly env: string;
  readonly region: string;
  readonly drRegion: string;
  readonly accounts: {
    readonly pipeline: { readonly id: string; readonly alias: string };
    readonly target: { readonly id: string; readonly alias: string };
  };
  readonly sourceBucket: { readonly name: string };
  readonly artifactBucket: { readonly name: string };
  readonly parameterStore: { readonly prefix: string };
}
```

### Parameter Store パラメータ構造

| パラメータ名 | 説明 | 例 |
|---|---|---|
| `/{pj}/{env}/account-id` | 対象環境のアカウント ID | `123456789012` |
| `/{pj}/{env}/region` | 対象環境のリージョン | `ap-northeast-1` |

## Error Handling

### Parameter Store 取得エラー

| エラーケース | 対応 |
|---|---|
| パラメータが存在しない | CDK synth 時に `valueFromLookup` が `dummy-value-for-*` を返す。実際のデプロイ時にエラーとなり中断 |
| 権限不足 | IAM ポリシーエラーとして CDK CLI がエラーメッセージを表示 |
| パラメータ値が不正（空文字等） | CDK の `env` に空文字が設定され、スタックデプロイ時に CloudFormation がエラーを報告 |

### デプロイエラー

| エラーケース | 対応 |
|---|---|
| クロスアカウント権限不足 | CDK Pipelines の bootstrap 未実行を示唆するエラーメッセージが表示される。Target_Account で `cdk bootstrap --trust PIPELINE_ACCOUNT_ID` の実行が必要 |
| 大阪リージョンの bootstrap 未実行 | Target_Account の ap-northeast-3 でも `cdk bootstrap` が必要 |
| S3 Source Bucket が空 | パイプラインが起動しない（トリガーが発火しない） |
| Synth Step 失敗 | パイプライン実行が Synth ステージで失敗。CodeBuild ログでエラー内容を確認 |
| 東京デプロイ成功・大阪デプロイ失敗 | パイプラインはステージ全体を失敗として扱う。大阪リージョンの権限・bootstrap を確認 |

### Direct_Deploy エラー

| エラーケース | 対応 |
|---|---|
| Target_Account への認証情報なし | AWS CLI/SDK がエラーを報告。`--profile` オプションまたは環境変数の設定が必要 |
| 大阪リージョンへのデプロイ権限なし | Target_Account の大阪リージョンに対する IAM 権限を確認 |
