import * as cdk from "aws-cdk-lib";
import { TokyoResourceStack } from "./stack-resource-tokyo";
import { projectName } from "../../pipeline/env";

export interface DeployProps {
  env?: cdk.Environment;
  envName: string;
  accountCode: string;
}

export function deployTokyo(scope: cdk.Stage, props: DeployProps): void {
  new TokyoResourceStack(scope, `stack-${projectName}-${props.envName}-${props.accountCode}-tokyo`, {
    env: props.env,
    envName: props.envName,
    accountCode: props.accountCode,
    stackName: `stack-${projectName}-${props.envName}-${props.accountCode}-tokyo`,
  });
}
