variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "codestar_connection_arn" {
  type        = string
  description = "Existing CodeStar Connections ARN (GitHub)."
}

variable "github_owner" {
  type = string
  default = "cosmicds"
}

variable "github_repo" {
  type = string
  default = "cds-api"
}

variable "github_branch" {
  type    = string
  default = "main"
}
