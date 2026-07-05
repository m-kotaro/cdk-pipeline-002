export const config = {
  projectName: "cp002",
  region: "ap-northeast-1",
  drRegion: "ap-northeast-3",
  stages: {
    dev: "dev",
    prd: "prd",
  },
  accounts: {
    pipeline: {
      id: "PIPELINE_ACCOUNT_ID",
      alias: "pipeline",
    },
    targets: [
      { stage: "dev", id: "DEV_ACCOUNT_ID", alias: "dev" },
      { stage: "prd", id: "PRD_ACCOUNT_ID", alias: "prd" },
    ],
  },
  sourceBucket: {
    name: "s3-cp002-source",
  },
  parameterStore: {
    prefix: "/cp002",
  },
} as const;

export type StageName = (typeof config.stages)[keyof typeof config.stages];
