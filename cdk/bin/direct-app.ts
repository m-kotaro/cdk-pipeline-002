#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { TokyoResourceStack } from "../lib/resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../lib/resources/osaka/stack-resource-osaka";
import { projectName, deployEnv, deployRegion, awsRegion, ssmPrefix } from "../lib/pipeline/env";

const app = new cdk.App();

// Parameter Store から Target Account 情報を取得
const targetAccountId = ssm.StringParameter.valueFromLookup(
  app,
  `${ssmPrefix}/${deployEnv}/target-account-id`
);

// リージョン名に応じたスタックをデプロイ
if (deployRegion === "tokyo") {
  new TokyoResourceStack(app, `stack-${projectName}-${deployEnv}-tokyo`, {
    env: {
      account: targetAccountId,
      region: awsRegion,
    },
    envName: deployEnv,
    stackName: `stack-${projectName}-${deployEnv}-tokyo`,
  });
} else if (deployRegion === "osaka") {
  new OsakaResourceStack(app, `stack-${projectName}-${deployEnv}-osaka`, {
    env: {
      account: targetAccountId,
      region: awsRegion,
    },
    envName: deployEnv,
    stackName: `stack-${projectName}-${deployEnv}-osaka`,
  });
}

app.synth();
