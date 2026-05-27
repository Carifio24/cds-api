variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "CosmicDS API server environment name"
  type        = string
  default     = "cds-api"
}

variable "cds_api_min_capacity" {
  description = "Minimum number of tasks for cds-api"
  type        = number
  default = 1
}

variable "cds_api_max_capacity" {
  description = "Maximum number of tasks for cds-api"
  type        = number
  default = 2
}

variable "cloudfront_secret" {
  description = "Secret value for CloudFront custom header to prevent direct ALB access. Leave empty to auto-generate."
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.cloudfront_secret == "" || length(var.cloudfront_secret) >= 32
    error_message = "CloudFront secret must be either empty (for auto-generation) or at least 32 characters long."
  }
}

variable "github_repository" {
  description = "GitHub repository in the format 'owner/repo'"
  type        = string
  default     = "cosmicds/cds-api"
}

variable "github_branch" {
  description = "GitHub branch to track for changes"
  type        = string
  default     = "main"
}

variable "alb_domain_name" {
  description = "Domain name for the ALB SSL certificate"
  type        = string
}

variable "api_secret_names" {
  description = "Secret keys expected in the CDS API secret"
  type        = list(string)
  default = [
    "DB_HOSTNAME",
    "DB_NAME",
    "DB_PASSWORD",
    "DB_USERNAME",
  ]
}
