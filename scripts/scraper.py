import requests
from bs4 import BeautifulSoup
import os
import json

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

kaynaklar = [
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
]

for kaynak in kaynaklar:
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        metinler = [p.get_text(strip=True) for p in soup.find_all(['p','div']) if len(p.get_text(strip=True)) > 300]
        print(f"{kaynak['alan']}: {len(metinler)} metin bulundu")
        for metin in metinler[:10]:
            data = {'anonymized_text': metin[:2000], 'niche_area': kaynak['alan']}
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/cases_vector_pool",
                headers=headers_sb,
                data=json.dumps(data)
            )
            print(f"Kayit: {r.status_code}")
    except Exception as e:
        print(f"Hata {kaynak['alan']}: {e}")

print("Tamamlandi!")
