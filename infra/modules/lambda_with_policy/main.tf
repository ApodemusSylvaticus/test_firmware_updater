# modules/lambda_with_policy/main.tf

resource "aws_iam_role" "lambda_role" {
  name = "lambda-role-${var.lambda_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "cognito-idp.amazonaws.com"
          ]
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name   = "lambda-policy-${var.lambda_name}"
  role   = aws_iam_role.lambda_role.id
  policy = file("${var.policy_file}")
}


# data "aws_s3_object" "lambda_zip" {
#   bucket = var.s3_bucket
#   key    = var.s3_key
# }

resource "aws_lambda_function" "lambda" {
  function_name = var.lambda_name
  s3_bucket     = var.s3_bucket
  s3_key        = var.s3_key
  role          = aws_iam_role.lambda_role.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  publish = true

#   source_code_hash = base64sha256(data.aws_s3_object.lambda_zip.body)
}