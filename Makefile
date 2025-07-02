# Folders
LAMBDA_DIR = ./lambda
DIST_DIR   = ./lambdaZips

# S3 bucket name
BUCKET_NAME = archer-lambda-storage-test

# Lambda function folders
LAMBDA_NAMES = firmware-updater-full \
               create-magic-link \
               define-magic-link \
               firmware-updater-only-firmware \
               firmware-updater-only-settings \
               get-firmware-list \
               refresh-tokens \
               request-for-access \
               start-auth \
               start-verify \
               verify-auth-token

.PHONY: init apply_s3 tf build upload code-deploy clean full-deploy update-amplify-env

# 1. Terraform initialization
init:
	terraform -chdir=infra init

# 2. Create S3 bucket(s) only
apply_s3:
	terraform -chdir=infra/s3-bucket init
	terraform -chdir=infra/s3-bucket apply -auto-approve

# 3. Apply main Terraform infrastructure
tf: init
	terraform -chdir=infra apply -auto-approve \
		-var="email_sender=$(TF_VAR_email_sender)" \
		-var="email_recipient=$(TF_VAR_email_recipient)" \
		-var="recaptcha_secret_key=$(TF_VAR_recaptcha_secret_key)" \
		-var="github_access_token=$(TF_VAR_github_access_token)"

# 4. Build zip files for Lambdas
build:
	@npm install
	@echo "Building Lambda zip files..."
	@node buildZips.js

# 5. Upload to S3
upload:
	@for L in $(LAMBDA_NAMES); do \
	  echo "Uploading $$L.zip to S3..."; \
	  aws s3 cp "$(DIST_DIR)/$$L.zip" "s3://$(BUCKET_NAME)/$$L.zip"; \
	done

# 6. Update Lambda code from S3
code-deploy:
	@for L in $(LAMBDA_NAMES); do \
	  echo "Updating code for $$L..."; \
	  aws lambda update-function-code --function-name "$$L" --s3-bucket "$(BUCKET_NAME)" --s3-key "$$L.zip"; \
	done

# 7. Clean zip files
clean:
	rm -rf $(DIST_DIR)

# 8. Update Amplify environment variables with API Gateway domain
update-amplify-env:
	@echo "Retrieving API Gateway domain and Amplify app ID..."
	@DOMAIN=$$(terraform -chdir=infra output -raw api_gateway_domain || echo "") && \
	APP_ID=$$(terraform -chdir=infra output -raw amplify_app_id || echo "") && \
	if [ -z "$$DOMAIN" ] || [ -z "$$APP_ID" ]; then \
	  echo "Missing DOMAIN or APP_ID from Terraform outputs"; \
	  exit 1; \
	fi && \
	echo "Updating Amplify environment variables..." && \
	aws amplify update-app --app-id $$APP_ID --environment-variables VITE_API_GATEWAY_DOMAIN=$$DOMAIN

# 9. Full deploy
full-deploy: build apply_s3 upload tf code-deploy update-amplify-env
