import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import { config, StageName } from "./config";

export interface StaticSiteStackProps extends cdk.StackProps {
  stageName: StageName;
}

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const pj = config.projectName;
    const domainName = `${stageName}.${config.domainName}`;

    // Import Hosted Zone ID from CloudFormation export
    const hostedZoneId = cdk.Fn.importValue(`${pj}-${stageName}-hostedzone-id`);
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId,
      zoneName: domainName,
    });

    // ACM Certificate in us-east-1 (required for CloudFront)
    const certificate = new acm.DnsValidatedCertificate(this, "Certificate", {
      domainName,
      hostedZone,
      region: "us-east-1",
    });

    // S3 Bucket: s3-[project]-[env]-site
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `s3-${pj}-${stageName}-site`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudFront Distribution: cf-[project]-[env]-site
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `cf-${pj}-${stageName}-site`,
      domainNames: [domainName],
      certificate,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin:
          cloudfront_origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Route 53 A Record (alias to CloudFront)
    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.CloudFrontTarget(distribution)
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, "BucketName", {
      value: siteBucket.bucketName,
    });

    new cdk.CfnOutput(this, "DomainName", {
      value: domainName,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
  }
}
