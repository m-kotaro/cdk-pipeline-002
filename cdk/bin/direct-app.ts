#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TokyoResourceStack } from "../lib/resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../lib/resources/osaka/stack-resource-osaka";
import { projectName, deployEnv, deployRegion, awsRegion, cdkDefaultAccount, targetAccountCode } from "../lib/pipeline/env";

const app = new cdk.App();

// Direct deploy では CDK_DEFAULT_ACCOUNT をターゲットアカウントとして使用
const targetAccountId = cdkDefaultAccount;

// リージョン名に応じたスタックをデプロイ
if (deployRegion === "tokyo") {
  new TokyoResourceStack(app, `stack-${projectName}-${deployEnv}-${targetAccountCode}-tokyo`, {
    env: {
      account: targetAccountId,
      region: awsRegion,
    },
    envName: deployEnv,
    accountCode: targetAccountCode,
    stackName: `stack-${projectName}-${deployEnv}-${targetAccountCode}-tokyo`,
  });
} else if (deployRegion === "osaka") {
  new OsakaResourceStack(app, `stack-${projectName}-${deployEnv}-${targetAccountCode}-osaka`, {
    env: {
      account: targetAccountId,
      region: awsRegion,
    },
    envName: deployEnv,
    accountCode: targetAccountCode,
    stackName: `stack-${projectName}-${deployEnv}-${targetAccountCode}-osaka`,
  });
}

app.synth();
