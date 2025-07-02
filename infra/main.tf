terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.91"
    }
  }


  backend "s3" {
    bucket = "archer-firmware-updater-terraform-state-test2"
    key    = "envs/main/terraform.tfstate"
    region = "eu-central-1"
    encrypt = true
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = var.region
}

locals {
  client_url = var.mode == "prod" ? "https://main.${module.amplify_app.amplify_app_default_domain}" : "http://localhost:5173"
  email_sender = var.email_sender
  email_recipient = var.email_recipient
  recaptcha_secret_key = var.recaptcha_secret_key
  github_access_token = var.github_access_token
}

data "aws_s3_bucket" "archer_lambda_storage_s3" {
  bucket = "archer-lambda-storage"
}

resource "aws_dynamodb_table" "magic_link" {
  name         = "magic_link"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "dbIndex"

  attribute {
    name = "dbIndex"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled  = true
  }

}


module "amplify_app" {
  source = "./modules/amplify"
  access_token = local.github_access_token
}

//LAMBDA
module "create_magic_link" {
  source = "./modules/lambda_with_policy"
  lambda_name = "create-magic-link"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "create-magic-link.zip"
  policy_file = "${path.module}/policy/lambda_create_magic_link_policy.json"
}

module "get_firmware_list" {
  source = "./modules/lambda_with_policy"
  lambda_name = "get-firmware-list"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "get-firmware-list.zip"
  policy_file = "${path.module}/policy/lambda_get_firmware_list_policy.json"

}

module "define_magic_link" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "define-magic-link"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "define-magic-link.zip"
  policy_file = "${path.module}/policy/lambda_define_magic_link_policy.json"

}

module "only_firmware" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "firmware-updater-only-firmware"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "firmware-updater-only-firmware.zip"
  policy_file = "${path.module}/policy/lambda_only_firmware_policy.json"

}

module "only_settings" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "firmware-updater-only-settings"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "firmware-updater-only-settings.zip"
  policy_file = "${path.module}/policy/lambda_only_settings_policy.json"

}

module "firmware_full" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "firmware-updater-full"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "firmware-updater-full.zip"
  policy_file = "${path.module}/policy/lambda_firmware_full_policy.json"

}

module "refresh_tokens" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "refresh-tokens"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "refresh-tokens.zip"
  policy_file = "${path.module}/policy/lambda_refresh_token_policy.json"

}

module "start_auth" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "start-auth"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "start-auth.zip"
  policy_file = "${path.module}/policy/lambda_start_auth_policy.json"
  timeout = 10

}

module "start_verify" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "start-verify"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "start-verify.zip"
  policy_file = "${path.module}/policy/lambda_start_verify_token_policy.json"
  timeout = 10

}

module "verify_auth_token" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "verify-auth-token"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "verify-auth-token.zip"
  policy_file = "${path.module}/policy/lambda_verify_auth_token_policy.json"
  timeout = 10

}

module "request_for_access" {
  source      = "./modules/lambda_with_policy"
  lambda_name = "request-for-access"
  s3_bucket   = data.aws_s3_bucket.archer_lambda_storage_s3.id
  s3_key      = "request-for-access.zip"
  policy_file = "${path.module}/policy/lambda_request_for_access_policy.json"
  timeout = 5

}
//-----------------------


resource "aws_cognito_user_pool" "firmware-updater-cognito-pool" {
  name = "firmware-updater-cognito-pool"

  lambda_config {
    create_auth_challenge           = module.create_magic_link.lambda_arn
    define_auth_challenge           = module.define_magic_link.lambda_arn
    verify_auth_challenge_response  = module.verify_auth_token.lambda_arn
  }

  depends_on = [
    module.create_magic_link,
    module.define_magic_link,
    module.verify_auth_token
  ]
}
resource "aws_cognito_user_pool_client" "updater-cognito-pool-client" {
  name = "updater-cognito-pool-client"


  user_pool_id = aws_cognito_user_pool.firmware-updater-cognito-pool.id

  explicit_auth_flows = ["ALLOW_CUSTOM_AUTH","ALLOW_REFRESH_TOKEN_AUTH"]
}

resource "aws_lambda_permission" "allow_cognito_define_auth" {
  statement_id  = "AllowCognitoInvokeDefineAuth"
  action        = "lambda:InvokeFunction"
  function_name = module.define_magic_link.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.firmware-updater-cognito-pool.arn
}

resource "aws_lambda_permission" "allow_cognito_create_auth" {
  statement_id  = "AllowCognitoInvokeCreateAuth"
  action        = "lambda:InvokeFunction"
  function_name = module.create_magic_link.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.firmware-updater-cognito-pool.arn
}

resource "aws_lambda_permission" "allow_cognito_verify_auth" {
  statement_id  = "AllowCognitoInvokeVerifyAuth"
  action        = "lambda:InvokeFunction"
  function_name = module.verify_auth_token.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.firmware-updater-cognito-pool.arn
}


resource "aws_api_gateway_authorizer" "firmware_authorizer" {
  name            = "firmware-updater-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.archer-api.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"
  provider_arns   = [aws_cognito_user_pool.firmware-updater-cognito-pool.arn]
}
resource "aws_cognito_user_group" "can-change-settings-group" {
  name         = "can-change-settings"
  user_pool_id = aws_cognito_user_pool.firmware-updater-cognito-pool.id
}

resource "aws_cognito_user_group" "can-set-master-password-group" {
  name         = "can-set-master-password"
  user_pool_id = aws_cognito_user_pool.firmware-updater-cognito-pool.id
}

resource "aws_cognito_user_group" "can-update-firmware-group" {
  name         = "can-update-firmware"
  user_pool_id = aws_cognito_user_pool.firmware-updater-cognito-pool.id
}

resource "aws_cognito_user_group" "verified-group" {
  name         = "verified"
  user_pool_id = aws_cognito_user_pool.firmware-updater-cognito-pool.id
}


resource "aws_api_gateway_rest_api" "archer-api" {
  name = "archer-api"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}



module "firmware_updater_lambda_api" {
  source = "./modules/api_gateway_lambda"
  depends_on = [aws_cognito_user_pool.firmware-updater-cognito-pool]
  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "firmware-updater-full"
  region                = var.region
  lambda_arn            = module.firmware_full.lambda_arn
  lambda_name           = module.firmware_full.function_name
  authorizer_id         = aws_api_gateway_authorizer.firmware_authorizer.id
  name_suffix           = "firmware-full"
  client_url = local.client_url
  http_methods = [
    {
      method        = "POST"
      authorization = "COGNITO_USER_POOLS"
      use_auth      = true
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "firmware_updater_only_settings_lambda_api" {
  source = "./modules/api_gateway_lambda"

  depends_on = [aws_cognito_user_pool.firmware-updater-cognito-pool]
  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "firmware-updater-only-settings"
  region                = var.region
  lambda_arn            = module.only_settings.lambda_arn
  lambda_name           = module.only_settings.function_name
  authorizer_id         = aws_api_gateway_authorizer.firmware_authorizer.id
  client_url = local.client_url
  name_suffix           = "firmware-only-settings"
  http_methods = [
    {
      method        = "POST"
      authorization = "COGNITO_USER_POOLS"
      use_auth      = true
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "firmware_updater_only_firmware_lambda_api" {
  source = "./modules/api_gateway_lambda"

  depends_on = [aws_cognito_user_pool.firmware-updater-cognito-pool]
  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "firmware-updater-only-firmware"
  region                = var.region
  lambda_arn            = module.only_firmware.lambda_arn
  lambda_name           = module.only_firmware.function_name
  authorizer_id         = aws_api_gateway_authorizer.firmware_authorizer.id
  client_url = local.client_url

  name_suffix           = "firmware-only-firmware"
  http_methods = [
    {
      method        = "POST"
      authorization = "COGNITO_USER_POOLS"
      use_auth      = true
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "refresh_token_lambda_api" {
  source = "./modules/api_gateway_lambda"

  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "refresh-token"
  region                = var.region
  lambda_arn            = module.refresh_tokens.lambda_arn
  lambda_name           = module.refresh_tokens.function_name
  authorizer_id         = null
  name_suffix           = "refresh-token"
  client_url = local.client_url

  http_methods = [
    {
      method        = "GET"
      authorization = "NONE"
      use_auth      = false
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "get_firmware_list_lambda_api" {
  source = "./modules/api_gateway_lambda"
  depends_on = [aws_cognito_user_pool.firmware-updater-cognito-pool]

  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "firmware-list"
  region                = var.region
  lambda_arn            = module.get_firmware_list.lambda_arn
  lambda_name           = module.get_firmware_list.function_name
  authorizer_id         = aws_api_gateway_authorizer.firmware_authorizer.id
  name_suffix           = "firmware-list"
  client_url = local.client_url

  http_methods = [
    {
      method        = "GET"
      authorization = "COGNITO_USER_POOLS"
      use_auth      = true
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "start_verify_lambda_api" {
  source = "./modules/api_gateway_lambda"

  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "start-verify"
  region                = var.region
  lambda_arn            = module.start_verify.lambda_arn
  lambda_name           = module.start_verify.function_name
  authorizer_id         = null
  name_suffix           = "start-verify"
  client_url = local.client_url

  http_methods = [
    {
      method        = "POST"
      authorization = "NONE"
      use_auth      = false
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "start_auth_lambda_api" {
  source = "./modules/api_gateway_lambda"

  rest_api_id           = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id             = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part             = "start-auth"
  region                = var.region
  lambda_arn            = module.start_auth.lambda_arn
  lambda_name           = module.start_auth.function_name
  authorizer_id         = null
  name_suffix           = "start-auth"
  client_url = local.client_url

  http_methods = [
    {
      method        = "POST"
      authorization = "NONE"
      use_auth      = false
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

module "request_for_access_lambda_api" {
  source = "./modules/api_gateway_lambda"

  rest_api_id             = aws_api_gateway_rest_api.archer-api.id
  rest_api_execution_arn  = aws_api_gateway_rest_api.archer-api.execution_arn
  parent_id               = aws_api_gateway_rest_api.archer-api.root_resource_id
  path_part               = "request-for-access"
  region                  = var.region
  lambda_arn              = module.request_for_access.lambda_arn
  lambda_name             = module.request_for_access.function_name
  authorizer_id           = null
  name_suffix             = "request-for-access"
  client_url = local.client_url

  http_methods = [
    {
      method        = "POST"
      authorization = "NONE"
      use_auth      = false
    },
    {
      method        = "OPTIONS"
      authorization = "NONE"
      use_auth      = false
    }
  ]
}

resource "aws_api_gateway_deployment" "archer_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.archer-api.id

  triggers = {
    redeployment = sha1(jsonencode([
      module.firmware_updater_lambda_api.resource_id,
      module.firmware_updater_lambda_api.post_method_id,
      module.firmware_updater_lambda_api.post_integration_id,

      module.refresh_token_lambda_api.resource_id,
      module.refresh_token_lambda_api.get_method_id,
      module.refresh_token_lambda_api.get_integration_id,

      module.start_verify_lambda_api.resource_id,
      module.start_verify_lambda_api.post_method_id,
      module.start_verify_lambda_api.post_integration_id,

      module.start_auth_lambda_api.resource_id,
      module.start_auth_lambda_api.post_method_id,
      module.start_auth_lambda_api.post_integration_id,

      module.request_for_access_lambda_api.resource_id,
      module.request_for_access_lambda_api.post_method_id,
      module.request_for_access_lambda_api.post_integration_id,

      module.firmware_updater_only_settings_lambda_api.resource_id,
      module.firmware_updater_only_settings_lambda_api.post_method_id,
      module.firmware_updater_only_settings_lambda_api.post_integration_id,

      module.firmware_updater_only_firmware_lambda_api.resource_id,
      module.firmware_updater_only_firmware_lambda_api.post_method_id,
      module.firmware_updater_only_firmware_lambda_api.post_integration_id,

      module.get_firmware_list_lambda_api.resource_id,
      module.get_firmware_list_lambda_api.post_method_id,
      module.get_firmware_list_lambda_api.post_integration_id,

    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "example" {
  deployment_id = aws_api_gateway_deployment.archer_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.archer-api.id
  stage_name    = "prod"
}

resource "aws_ssm_parameter" "magic_link_table" {
  name  = "/${var.ssm_prefix}/magic_link_dynamoDB_table_name"
  type  = "String"
  value = aws_dynamodb_table.magic_link.name
}

resource "aws_ssm_parameter" "client_url" {
  name  = "/${var.ssm_prefix}/client_url"
  type  = "String"
  value =   local.client_url
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "/${var.ssm_prefix}/cognito_client_id"
  type  = "String"
  value = aws_cognito_user_pool_client.updater-cognito-pool-client.id
}

resource "aws_ssm_parameter" "cognito_user_pool" {
  name  = "/${var.ssm_prefix}/cognito_user_pool"
  type  = "String"
  value = aws_cognito_user_pool.firmware-updater-cognito-pool.id
}

resource "aws_ssm_parameter" "auth_token_secret_key" {
  name   = "/${var.ssm_prefix}/auth_token_secret_key"
  type   = "SecureString"
  value  = "3456mouseKey7890"
  key_id = "alias/aws/ssm"
}

resource "aws_ssm_parameter" "email_sender" {
  name   = "/${var.ssm_prefix}/email_sender"
  type   = "String"
  value  = local.email_sender
}

resource "aws_ssm_parameter" "email_recipient" {
  name   = "/${var.ssm_prefix}/email_recipient"
  type   = "String"
  value  = local.email_recipient
}

resource "aws_ssm_parameter" "recaptcha_secret_key" {
  name   = "/${var.ssm_prefix}/recaptcha_secret_key"
  type   = "SecureString"
  value  = local.recaptcha_secret_key
  key_id = "alias/aws/ssm"
}

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = module.amplify_app.amplify_app_id
}

output "api_gateway_domain" {
  description = "API Gateway domain"
  value       = "https://${aws_api_gateway_rest_api.archer-api.id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_stage.example.stage_name}"
}
output "client_url" {
  description = "Client url"
  value       = local.client_url
}