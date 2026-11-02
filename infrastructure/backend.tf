terraform {
  backend "s3" {
    key          = "cds-api/terraform.tfstate"
    bucket       = "cosmicds-terraform-state"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
