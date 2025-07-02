# modules/lambda_with_policy/variables.tf

variable "lambda_name" {
  type = string
}

variable "s3_bucket" {
  type = string
}

variable "s3_key" {
  type = string
}

variable "handler" {
  type    = string
  default = "index.handler"
}

variable "runtime" {
  type    = string
  default = "nodejs22.x"
}

variable "timeout" {
  type = number
  default = 3
}


variable "policy_file" {
  type = string
}

