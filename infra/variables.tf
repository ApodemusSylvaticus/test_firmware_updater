variable "region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "eu-central-1"
}

variable "ssm_prefix" {
  type    = string
  default = "firmwareUpdater"
}

variable "email_sender" {
  type = string
}

variable "email_recipient" {
  type = string
}

variable "mode" {
  type    = string
  default = "dev"
  description = "Deployment environment: dev or prod"
}

variable "recaptcha_secret_key" {
  type    = string
}

variable "github_access_token" {
  type        = string
  description = "Personal Access Token for GitHub (if using GitHub)"
  sensitive   = true
}