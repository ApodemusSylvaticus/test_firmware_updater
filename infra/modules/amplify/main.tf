resource "aws_iam_role" "amplify_service_role" {
  name               = "amplify-service-role"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume_role_policy.json
  path = "/"
}

data "aws_iam_policy_document" "amplify_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "amplify_service_role_policy" {
  name = "amplify-service-policy"
  role = aws_iam_role.amplify_service_role.id

  policy = data.aws_iam_policy_document.amplify_service_role_document.json
}

data "aws_iam_policy_document" "amplify_service_role_document" {
  statement {
    actions = [
      "s3:*",
      "cloudfront:*",
      "logs:*",
      "codebuild:*",
      "iam:PassRole",
    ]
    resources = ["*"]
  }
}


locals {
  buildspec_content = file("${path.module}/amplify-buildspec.yaml")

}

resource "aws_amplify_app" "client" {
  name                 = "firmware_updater"
  repository           = "https://github.com/tortorino/test_firmware_updater"
  iam_service_role_arn = aws_iam_role.amplify_service_role.arn
  access_token          = var.access_token
  build_spec            = local.buildspec_content
  custom_rule {
    source = "</^((?!\\.).)*$/>"
    target = "/index.html"
    status = "200"
  }
}


resource "aws_amplify_branch" "main_branch" {
  app_id      = aws_amplify_app.client.id
  branch_name = "main"
  enable_auto_build = false
}

output "amplify_app_id" {
  description = "ID of Amplify App"
  value       = aws_amplify_app.client.id
}

output "amplify_app_default_domain" {
  description = "Default domain for Amplify App"
  value       = aws_amplify_app.client.default_domain
}

