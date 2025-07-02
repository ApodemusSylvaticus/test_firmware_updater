variable "rest_api_id" {
  type = string
}

variable "rest_api_execution_arn" {
  type = string
}

variable "parent_id" {
  type = string
}

variable "path_part" {
  type = string
}

variable "region" {
  type = string
}

variable "lambda_arn" {
  type = string
}

variable "lambda_name" {
  type = string
}

variable "authorizer_id" {
  description = "Optional authorizer ID for secured endpoints"
  type        = string
  default     = null
}

variable "name_suffix" {
  type        = string
  description = "Suffix to make resource names unique"
}

variable "http_methods" {
  type = list(object({
    method        = string
    authorization = string
    use_auth      = bool
  }))
  description = "List of HTTP methods and their auth types"
}

variable "client_url" {
  description = "Client url"
  type        = string
}
