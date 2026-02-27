terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_elastic_beanstalk_environment" "cds_api" {
  name                = "${var.environment}-ebs"
  application         = aws_elastic_beanstalk_application.cds_api.name
  solution_stack_name = "64bit Amazon Linux 2015.03 v2.0.3 running Go 1.4"
}

resource "aws_elastic_beanstalk_application" "cds_api" {
  name        = "${var.environment}-ebs-application"
  description = "CosmicDS API server EBS application"
}
