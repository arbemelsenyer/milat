"""
Bu makinede scraper.py'yi service_role olmadan, admin kullanıcının
password-grant JWT'siyle çalıştırmak için yardımcı script.

Kullanım:
    $env:ADMIN_EMAIL = "admin@ornek.com"
    $env:ADMIN_PASSWORD = "..."
    python scripts\run_scraper_local.py

Ne yapar:
  1. ADMIN_EMAIL / ADMIN_PASSWORD ortam değişkenlerini okur (kodda saklanmaz).
  2. .env'den VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (anon key),
     .env.scraper'dan GEMINI_API_KEY'i okur.
  3. GoTrue password-grant ile giriş yapıp access_token alır.
  4. scraper.py'yi aynı süreçte, SUPABASE_KEY=access_token,
     SUPABASE_ANON_KEY=anon_key, GEMINI_API_KEY=... ortamıyla çalıştırır.
"""
import os
import re
import subprocess
import sys

import requests

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO_ROOT, ".env")
ENV_SCRAPER_PATH = os.path.join(REPO_ROOT, ".env.scraper")
SCRAPER_PATH = os.path.join(REPO_ROOT, "scripts", "scraper.py")


def parse_env_file(path):
    """KEY=value veya KEY="value" satırlarını basitçe ayrıştırır."""
    values = {}
    if not os.path.isfile(path):
        return values
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            values[key] = val
    return values


def main():
    admin_email = os.environ.get("ADMIN_EMAIL", "")
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        print("HATA: ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri gerekli.")
        print('Örnek (PowerShell): $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."')
        sys.exit(1)

    env_vals = parse_env_file(ENV_PATH)
    supabase_url = env_vals.get("VITE_SUPABASE_URL", "")
    anon_key = env_vals.get("VITE_SUPABASE_PUBLISHABLE_KEY", "")
    if not supabase_url or not anon_key:
        print(f"HATA: {ENV_PATH} içinde VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY bulunamadı.")
        sys.exit(1)

    scraper_env_vals = parse_env_file(ENV_SCRAPER_PATH)
    gemini_key = scraper_env_vals.get("GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key:
        print(f"UYARI: GEMINI_API_KEY {ENV_SCRAPER_PATH} içinde bulunamadı ve ortamda da yok.")
        print("Scraper GEMINI_API_KEY olmadan hiçbir kaynağı taramadan çıkar (ana script'teki kontrol nedeniyle).")

    token_url = f"{supabase_url}/auth/v1/token?grant_type=password"
    try:
        resp = requests.post(
            token_url,
            headers={"apikey": anon_key, "Content-Type": "application/json"},
            json={"email": admin_email, "password": admin_password},
            timeout=20,
        )
    except requests.exceptions.RequestException as e:
        print(f"HATA: Giriş isteği başarısız oldu (ağ hatası): {e}")
        sys.exit(1)

    if resp.status_code != 200:
        print(f"HATA: Giriş başarısız — HTTP {resp.status_code}")
        try:
            body = resp.json()
        except ValueError:
            body = resp.text
        print(f"Sunucu yanıtı: {body}")
        if resp.status_code == 400:
            print("Olası neden: e-posta/şifre hatalı.")
        elif resp.status_code == 401:
            print("Olası neden: apikey (anon key) geçersiz/reddedildi.")
        sys.exit(1)

    data = resp.json()
    access_token = data.get("access_token", "")
    if not access_token:
        print(f"HATA: Yanıtta access_token yok. Sunucu yanıtı: {data}")
        sys.exit(1)

    print("Giriş başarılı, access_token alındı (değer ekrana yazdırılmıyor).")

    child_env = dict(os.environ)
    child_env["SUPABASE_KEY"] = access_token
    child_env["SUPABASE_ANON_KEY"] = anon_key
    if gemini_key:
        child_env["GEMINI_API_KEY"] = gemini_key

    result = subprocess.run([sys.executable, SCRAPER_PATH], env=child_env, cwd=REPO_ROOT)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
