python
import os
import requests
import json

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def metin_embedding_uret(metin):
    if not GEMINI_API_KEY:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": metin}]},
        "outputDimensionality": 1536
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        return r.json()['embedding']['values']
    except:
        return None

def guvenli_akademik_arama(uyusmazlik_metni, oda_adi, esik_deger=0.75):
    sorgu_vektoru = metin_embedding_uret(uyusmazlik_metni)
    if not sorgu_vektoru:
        return "Sistem hatası: Embedding üretilemedi."

    url = f"{SUPABASE_URL}/rest/v1/rpc/match_cases"
    payload = {
        "query_embedding": sorgu_vektoru,
        "match_threshold": esik_deger,
        "match_count": 3,
        "filter_niche_area": oda_adi
    }
    try:
        r = requests.post(url, headers=headers_sb, json=payload, timeout=15)
        sonuclar = r.json()
        if not sonuclar or len(sonuclar) == 0:
            return (
                f"⚠️ GÜVENLİK KİLİDİ:\n"
                f"Girdiğiniz uyuşmazlık ile '{oda_adi}' odasındaki akademik verilerimiz "
                f"arasında güvenli bir bağ kurulamadı. Yapay zekanın uydurma veri üretme riskine karşı analiz durdurulmuştur."
            )
        return sonuclar
    except Exception as e:
        return f"Veritabanı bağlantı hatası: {e}"
