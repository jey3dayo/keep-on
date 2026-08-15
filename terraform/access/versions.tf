terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# 認証は環境変数 CLOUDFLARE_API_TOKEN を使う（dotenvx 経由で注入する）。
# トークンには Account > Access: Apps and Policies > Edit が必要。
provider "cloudflare" {}
