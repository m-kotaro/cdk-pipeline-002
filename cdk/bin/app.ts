#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PipelineStack } from "../lib/stack-pipeline";
import { config } from "../lib/config";

const app = new cdk.App();

new PipelineStack(app, `stack-${config.projectName}-pipeline`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
  },
});

app.synth();
