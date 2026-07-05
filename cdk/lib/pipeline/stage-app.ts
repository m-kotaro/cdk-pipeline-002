import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { TokyoResourceStack } from "../resources/tokyo/stack-resource-tokyo";
import { OsakaResourceStack } from "../resources/osaka/stack-resource-osaka";
import { config, StageName } from "./config";

export interface AppStageProps extends cdk.StageProps {
  stageName: StageName;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    // 東京リージョン（メイン）
    new TokyoResourceStack(
      this,
      `stack-${config.projectName}-${props.stageName}-tokyo`,
      {
        env: {
          account: props.env?.account,
          region: config.region,
        },
        stageName: props.stageName,
        stackName: `stack-${config.projectName}-${props.stageName}-tokyo`,
      }
    );

    // 大阪リージョン（DR）
    new OsakaResourceStack(
      this,
      `stack-${config.projectName}-${props.stageName}-osaka`,
      {
        env: {
          account: props.env?.account,
          region: config.drRegion,
        },
        stageName: props.stageName,
        stackName: `stack-${config.projectName}-${props.stageName}-osaka`,
      }
    );
  }
}
