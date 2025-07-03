terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.91"
    }
  }

  backend "s3" {
    bucket = "archer-firmware-updater-terraform-state"
    key    = "envs/s3/terraform.tfstate"
    region = "eu-central-1"
    encrypt = true
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "eu-central-1"
}

resource "aws_s3_bucket" "firmware_storage" {
  bucket = "archer-firmware-storage"
}

resource "aws_s3_bucket" "lambda_storage" {
  bucket = "archer-lambda-storage"
  force_destroy = true

}


resource "aws_s3_bucket" "firmware_temporary_storage" {
  bucket = "archer-firmware-temporary-storage"

}

resource "aws_s3_bucket_lifecycle_configuration" "delete_after_1_day" {
  bucket = aws_s3_bucket.firmware_temporary_storage.id
  depends_on = [aws_s3_bucket.firmware_temporary_storage]

  rule {
    id     = "auto-delete-after-1-day"
    status = "Enabled"

    expiration {

      days = 1
    }

    filter {
      prefix = ""
    }
  }
}

variable "ssm_prefix" {
  type    = string
  default = "firmwareUpdater"
}

resource "aws_ssm_parameter" "s3_firmware_storage" {
  name   = "/${var.ssm_prefix}/s3_firmware_storage"
  type   = "String"
  value  = aws_s3_bucket.firmware_storage.bucket
}

resource "aws_ssm_parameter" "s3_firmware_temporary_storage" {
  name   = "/${var.ssm_prefix}/s3_firmware_temporary_storage"
  type   = "String"
  value  = aws_s3_bucket.firmware_temporary_storage.bucket
}

