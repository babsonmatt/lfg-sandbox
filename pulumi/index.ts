import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import { ApplicationLoadBalancer } from "@pulumi/awsx/lb";

// Assuming the existing ALB ARN and listener ARN are known or retrieved from configuration
const existingAlbArn =
  "arn:aws:elasticloadbalancing:us-east-1:542881274472:loadbalancer/app/tes/e1e95f31238917f7";
const existingListenerArn =
  "arn:aws:elasticloadbalancing:us-east-1:542881274472:listener/app/tes/e1e95f31238917f7/9ef3d05eb0fba376";
const existingTargetGroupArn =
  "arn:aws:elasticloadbalancing:us-east-1:542881274472:targetgroup/test/9d4ba7b9eb3c068c";

async function main() {
  const existingAlb = await aws.lb.getLoadBalancer({
    arn: existingAlbArn,
    name: "tes",
  });

  const existingListener = await aws.lb.getListener({
    arn: existingListenerArn,
  });

  console.log(existingAlb);

  const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
  });

  // Build and publish a Docker image to a private ECR registry.
  const img = new awsx.ecr.Image("app-img", {
    repositoryUrl: repo.url,
    context: "./app",
  });

  const cluster = new awsx.classic.ecs.Cluster("cluster");

  // Create a Fargate service task that can scale out.
  const appService = new awsx.classic.ecs.FargateService("app-svc", {
    cluster,
    taskDefinitionArgs: {
      container: {
        image: img.imageUri,
        cpu: 102 /*10% of 1024*/,
        memory: 50 /*MB*/,
      },
    },
    desiredCount: 5,
    loadBalancers: [
      {
        targetGroupArn: existingTargetGroupArn,
        containerName: "test",
        containerPort: 80,
      },
    ],
  });
}

main();

// Export the name of the bucket
// export const bucketName = bucket.id;
