output "resource_id" {
  value = aws_api_gateway_resource.resource.id
}

output "post_method_id" {
  value = lookup(aws_api_gateway_method.api_method, "POST", null) != null ? aws_api_gateway_method.api_method["POST"].id : null
}

output "get_method_id" {
  value = lookup(aws_api_gateway_method.api_method, "GET", null) != null ? aws_api_gateway_method.api_method["GET"].id : null
}

output "post_integration_id" {
  value = lookup(aws_api_gateway_integration.method_integration, "POST", null) != null ? aws_api_gateway_integration.method_integration["POST"].id : null
}

output "get_integration_id" {
  value = lookup(aws_api_gateway_integration.method_integration, "GET", null) != null ? aws_api_gateway_integration.method_integration["GET"].id : null
}
