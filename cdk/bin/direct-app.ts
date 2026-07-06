#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { deployTokyo } from "../lib/resources/tokyo/deploy-tokyo";
import { deployOsaka } from "../lib/resources/osaka/deploy-osaka";
import { deployEnv, deployRegion, awsRegion, cdkDefaultAccount, targetAccountCode } from "../lib/pipeline/env";

const app = new cdk.App();

// Direct deploy では CDK_DEFAULT_ACCOUNT をターゲットアカウントとして使用
const deployProps = {
  env: {
    account: cdkDefaultAccount,
    region: awsRegion,
  },
  envName: deployEnv,
  accountCode: targetAccountCode,
};

if (deployRegion === "tokyo") {
  deployTokyo(app, deployProps);
} else if (deployRegion === "osaka") {
  deployOsaka(app, deployProps);
}

app.synth();
