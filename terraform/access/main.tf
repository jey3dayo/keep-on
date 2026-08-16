variable "account_id" {
  description = "Cloudflare account ID（環境変数 TF_VAR_account_id で渡す）"
  type        = string
}

# アプリ本体。全パスを Access（Google ログイン + owner 限定）で保護する。
resource "cloudflare_zero_trust_access_application" "keep_on" {
  account_id       = var.account_id
  name             = "keep-on"
  type             = "self_hosted"
  domain           = "keep-on.jey3dayo.net"
  session_duration = "730h"

  auto_redirect_to_identity  = false
  enable_binding_cookie      = false
  http_only_cookie_attribute = false
  options_preflight_bypass   = false

  policies = [{
    name       = "Allow owner"
    decision   = "allow"
    precedence = 1
    include = [{
      email = { email = "j138cm@gmail.com" }
    }]
  }]
}

# 既存アプリを、state がない環境でも初回 apply 時に管理下へ取り込む。
# Access application UUID は秘密情報ではないため、再現可能な import ID として管理する。
import {
  to = cloudflare_zero_trust_access_application.keep_on
  id = "accounts/4e7695e2370bc9cef6ae9f2802517dd3/d9973175-4159-4e35-87f6-fc8049126ee2"
}

# 静的アセットと PWA ファイルだけ認証不要にする（Issue #190）。
# 未認証時にこれらが Access ログインへ 302 されると、CSP がリダイレクト先
# （cloudflareaccess.com）を style-src / script-src 違反としてブロックし画面が崩れる。
# コンテンツハッシュ付きビルド成果物と PWA マニフェスト類のみで、秘密情報は含まない。
resource "cloudflare_zero_trust_access_application" "keep_on_public_assets" {
  account_id       = var.account_id
  name             = "keep-on-public-assets"
  type             = "self_hosted"
  domain           = "keep-on.jey3dayo.net/_next/static/*"
  session_duration = "24h"

  auto_redirect_to_identity  = false
  enable_binding_cookie      = false
  http_only_cookie_attribute = false
  options_preflight_bypass   = false

  destinations = [
    { type = "public", uri = "keep-on.jey3dayo.net/_next/static/*" },
    { type = "public", uri = "keep-on.jey3dayo.net/manifest.json" },
    { type = "public", uri = "keep-on.jey3dayo.net/sw.js" },
    { type = "public", uri = "keep-on.jey3dayo.net/icon-*.png" },
    { type = "public", uri = "keep-on.jey3dayo.net/apple-touch-icon.png" },
  ]

  policies = [{
    name       = "bypass-public-assets"
    decision   = "bypass"
    precedence = 1
    include = [{
      everyone = {}
    }]
  }]
}

# 静的アセット bypass 用の既存アプリも同様に取り込む。
import {
  to = cloudflare_zero_trust_access_application.keep_on_public_assets
  id = "accounts/4e7695e2370bc9cef6ae9f2802517dd3/bf987fc3-074c-430d-8ca0-eeb781bd6774"
}
