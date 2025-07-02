resource "aws_api_gateway_resource" "resource" {
  parent_id   = var.parent_id
  path_part   = var.path_part
  rest_api_id = var.rest_api_id
}

resource "aws_api_gateway_method" "api_method" {
  for_each = { for item in var.http_methods : item.method => item }

  rest_api_id   = var.rest_api_id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = each.key
  authorization = each.value.authorization
  authorizer_id = (
    each.value.use_auth && var.authorizer_id != null
    ? var.authorizer_id
    : null
  )
}

# Integration for non-OPTIONS methods using AWS_PROXY
resource "aws_api_gateway_integration" "method_integration" {
  for_each = {
    for k, v in aws_api_gateway_method.api_method :
    k => v if k != "OPTIONS"
  }

  rest_api_id             = var.rest_api_id
  resource_id             = aws_api_gateway_resource.resource.id
  http_method             = each.value.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = "arn:aws:apigateway:${var.region}:lambda:path/2015-03-31/functions/${var.lambda_arn}/invocations"
}

# Lambda permission
resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke-${var.name_suffix}"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.rest_api_execution_arn}/*/*"
}

# --- CORS Support for OPTIONS method ---

# OPTIONS integration (MOCK)
resource "aws_api_gateway_integration" "options_integration" {
  for_each = {
    for k, v in aws_api_gateway_method.api_method :
    k => v if k == "OPTIONS"
  }

  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = each.value.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = <<EOF
{
  "statusCode": 200
}
EOF
  }
}

# Method response for OPTIONS
resource "aws_api_gateway_method_response" "options_response" {
  for_each = aws_api_gateway_integration.options_integration

  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = each.value.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Integration response for OPTIONS
resource "aws_api_gateway_integration_response" "options_integration_response" {
  # This is assuming you already have a corresponding aws_api_gateway_method_response for OPTIONS
  for_each    = aws_api_gateway_method_response.options_response
  rest_api_id = var.rest_api_id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = each.key
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin" = "'${var.client_url}'"
  }

  response_templates = {
    "application/json" = ""
  }
}