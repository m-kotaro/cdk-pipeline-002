import * as cdk from "aws-cdk-lib";
import { OsakaResourceStack } from "./stack-resource-osaka";
import { projectName } from "../../pipeline/env";

export interface DeployProps {
  env?: cdk.Environment;
  envName: string;
  accountCode: string;
}

export function deployOsaka(scope: cdk.Stage, props: DeployProps): void {
  new OsakaResourceStack(scope, `stack-${projectName}-${props.envName}-${props.accountCode}-osaka`, {
    env: props.env,
    envName: props.envName,
    accountCode: props.accountCode,
    stackName: `stack-${projectName}-${props.envName}-${props.accountCode}-osaka`,
  });
}
