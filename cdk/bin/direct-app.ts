#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { TokyoResourceStack } from "../lib/resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../lib/resources/osaka/stack-resource-osaka";
import { config, StageName } from "../lib/pipeline/config";

const app = new cdk.App();

// コンテキストまたは環境変数からステージを取得
const stage = (app.node.tryGetContext("stage") ||
  process.env.DEPLOY_STAGE ||
  "dev") as StageName;

// Parameter Store から Target Account 情報を取得
const targetAccountId = ssm.StringParameter.valueFromLookup(
  app,
  `${config.parameterStore.prefix}/${stage}/account-id`
);
const targetRegion = ssm.StringParameter.valueFromLookup(
  app,
  `${config.parameterStore.prefix}/${stage}/region`
);

// 東京リージョン（メイン）
new TokyoResourceStack(app, `stack-${config.projectName}-${stage}-tokyo`, {
  env: {
    account: targetAccountId,
    region: targetRegion,
  },
  stageName: stage,
  stackName: `stack-${config.projectName}-${stage}-tokyo`,
});

// 大阪リージョン（DR）
new OsakaResourceStack(app, `stack-${config.projectName}-${stage}-osaka`, {
  env: {
    account: targetAccountId,
    region: config.drRegion,
  },
  stageName: stage,
  stackName: `stack-${config.projectName}-${stage}-osaka`,
});

app.synth();
