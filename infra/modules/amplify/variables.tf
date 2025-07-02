variable "access_token" {
  type        = string
  description = "Personal Access Token for GitHub (if using GitHub)"
  sensitive   = true
}
variable "branch_name" {
  type        = string
  description = "Personal Access Token for GitHub (if using GitHub)"
  default     = ""
  sensitive   = true
}