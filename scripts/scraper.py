import os
import io
import json
import hashlib
import requests
from bs4 import BeautifulSoup
import pypdf

SUPABASE_URL = "https://oijdnfibboiinogdmlcj.supabase.co"
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '') 

headers_sb = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def metin_hash(metin):
    return hashlib.md5(metin.encode('utf-8')).hexdigest()

def zaten_var_mi(h):
    url = f"{SUPABASE_URL}/rest/v1/cases_vector_pool?content_hash=eq.{h}"
    try:
        r = requests.get(url, headers=headers_sb, timeout=10)
        if r.status_code == 200:
            return len(r.json()) > 0
    except:
        pass
    return False

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

def akilli_parcala(metin, chunk_size=1500, overlap=200):
    sentences = metin.split('. ')
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) < chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

def pdf_metin_ayikla(pdf_content):
    try:
        pdf_file = io.BytesIO(pdf_content)
        reader = pypdf.PdfReader(pdf_file)
        tam_metin = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                tam_metin += text + "\n"
        return tam_metin
    except:
        return ""

def dergipark_ve_pdf_isle(kaynak):
    yeni, atlandi = 0, 0
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        linkler = set()
        for a in soup.find_all('a', href=True):
            if "/pub/" in a['href'] or "/download/" in a['href'] or "pdf" in a['href'].lower():
                linkler.add(a['href'] if a['href'].startswith("http") else "https:" + a['href'])
        for link in list(linkler)[:3]:
            try:
                if "download" in link or link.endswith(".pdf"):
                    pdf_res = requests.get(link, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                    ham_metin = pdf_metin_ayikla(pdf_res.content)
                else:
                    detay = requests.get(link, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
                    d_soup = BeautifulSoup(detay.text, 'html.parser')
                    pdf_url = None
                    for aa in d_soup.find_all('a', href=True):
                        if "/download/article-file/" in aa['href']:
                            pdf_url = aa['href'] if aa['href'].startswith("http") else "https:" + aa['href']
                            break
                    if pdf_url:
                        pdf_res = requests.get(pdf_url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
                        ham_metin = pdf_metin_ayikla(pdf_res.content)
                    else:
                        continue
                if len(ham_metin) < 300: continue
                parcalar = akilli_parcala(ham_metin)
                for p in parcalar:
                    if len(p) < 200: continue
                    h = metin_hash(p)
                    if zaten_var_mi(h):
                        atlandi += 1
                        continue
                    vektor = metin_embedding_uret(p)
                    if not vektor: continue 
                    data = {
                        'anonymized_text': p, 
                        'niche_area': kaynak['alan'], 
                        'content_hash': h,
                        'embedding': vektor 
                    }
                    requests.post(f"{SUPABASE_URL}/rest/v1/cases_vector_pool", headers=headers_sb, json=data)
                    yeni += 1
            except:
                continue
    except Exception as e:
        print(f"Hata ({kaynak['alan']}): {e}")
    return yeni, atlandi

def standart_web_isle(kaynak):
    yeni, atlandi = 0, 0
    try:
        res = requests.get(kaynak['url'], timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(res.text, 'html.parser')
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
        metinler = [p.get_text(strip=True) for p in soup.find_all(['p', 'div', 'td']) if len(p.get_text(strip=True)) > 300]
        tum_metin = " ".join(metinler)
        parcalar = akilli_parcala(tum_metin)
        for parca in parcalar[:10]:
            h = metin_hash(parca)
            if zaten_var_mi(h):
                atlandi += 1
                continue
            vektor = metin_embedding_uret(parca)
            if not vektor: continue
            data = {
                'anonymized_text': parca, 
                'niche_area': kaynak['alan'], 
                'content_hash': h,
                'embedding': vektor
            }
            requests.post(f"{SUPABASE_URL}/rest/v1/cases_vector_pool", headers=headers_sb, json=data)
            yeni += 1
    except Exception as e:
        print(f"Hata ({kaynak['alan']}): {e}")
    return yeni, atlandi


# ============================================================
# YENİ: Resmi Gazete & TBMM mevzuat takibi
# Bu iki fonksiyon cases_vector_pool yerine pending_pool tablosuna yazar.
# Admin panelinden onaylanan kayıtlar knowledge_base_chunks'a taşınır.
# ============================================================

MEVZUAT_ANAHTAR = ["arabuluculuk", "arabulucu", "arabuluculuğa", "arabuluculuğun"]

def _pending_zaten_var_mi(url):
    """pending_pool'da aynı source_url ile kayıt var mı?"""
    if not url:
        return False
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/pending_pool?source_url=eq.{requests.utils.quote(url, safe='')}&select=id&limit=1",
            headers=headers_sb, timeout=10,
        )
        if r.status_code == 200:
            return len(r.json()) > 0
    except Exception as e:
        print(f"_pending_zaten_var_mi (pending_pool) hata: {e}")
    # knowledge_base_chunks'da da onaylanmış olabilir
    try:
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/knowledge_base_chunks?source_url=eq.{requests.utils.quote(url, safe='')}&select=id&limit=1",
            headers=headers_sb, timeout=10,
        )
        if r.status_code == 200 and len(r.json()) > 0:
            return True
    except Exception as e:
        print(f"_pending_zaten_var_mi (knowledge_base_chunks) hata: {e}")
    return False


def _pending_ekle(title, url, raw_content, metadata=None):
    """pending_pool'a yeni bir mevzuat kaydı ekle."""
    if not raw_content or len(raw_content) < 200:
        return False
    if _pending_zaten_var_mi(url):
        return False
    body = {
        "source_url": url,
        "raw_content": raw_content[:200000],
        "niche_area": "mevzuat",
        "status": "pending",
        "metadata": {
            "source_title": (title or "")[:300],
            "provider": (metadata or {}).get("provider", "unknown"),
            **(metadata or {}),
        },
    }
    try:
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/pending_pool",
            headers={**headers_sb, "Prefer": "return=minimal"},
            json=body, timeout=15,
        )
        return r.status_code in (200, 201, 204)
    except Exception as e:
        print(f"pending_pool insert hata: {e}")
        return False


def _metin_alakali(metin):
    if not metin:
        return False
    low = metin.lower()
    return any(k in low for k in MEVZUAT_ANAHTAR)


def scrape_resmi_gazete():
    """
    Resmi Gazete son 30 günlük arşivini tarar; her günün PDF fihristini
    indirip 'arabuluculuk' geçiyorsa pending_pool'a tek kayıt olarak ekler.
    """
    import datetime as _dt
    yeni = 0
    today = _dt.date.today()
    for offset in range(0, 30):
        gun = today - _dt.timedelta(days=offset)
        # Resmi Gazete günlük PDF fihrist URL kalıbı
        url = f"https://www.resmigazete.gov.tr/eskiler/{gun.year:04d}/{gun.month:02d}/{gun.year:04d}{gun.month:02d}{gun.day:02d}.pdf"
        try:
            res = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
            if res.status_code != 200:
                print(f"[Resmi Gazete] {url} -> HTTP {res.status_code}")
                continue
            if _pending_zaten_var_mi(url):
                continue
            ham = pdf_metin_ayikla(res.content)
            if not _metin_alakali(ham) or len(ham) < 300:
                continue
            if _pending_ekle(f"Resmi Gazete {gun.isoformat()}", url, ham, {"provider": "resmi_gazete", "yayin_tarihi": gun.isoformat()}):
                yeni += 1
                print(f"[Resmi Gazete] +1: {gun.isoformat()}")
        except Exception as e:
            print(f"[Resmi Gazete] gün hata {gun}: {e}")
    return yeni


def scrape_tbmm():
    """
    TBMM sitesinde 'arabuluculuk' araması yaparak kanun tekliflerini
    ve kabul edilen kanunları pending_pool'a ekler.
    """
    yeni = 0
    search_urls = [
        "https://www.tbmm.gov.tr/develop/owa/kanun_teklifi_sd.sorgu_yonlendirme?kelime=arabuluculuk",
        "https://www.tbmm.gov.tr/develop/owa/kanunlar_sd.sorgu_yonlendirme?kelime=arabuluculuk",
        "https://www.google.com/search?q=site:tbmm.gov.tr+arabuluculuk",
    ]
    for surl in search_urls:
        try:
            res = requests.get(surl, timeout=25, headers={'User-Agent': 'Mozilla/5.0'})
            if res.status_code != 200:
                print(f"[TBMM] {surl} -> HTTP {res.status_code}")
                continue
            soup = BeautifulSoup(res.text, 'html.parser')
            for a in soup.find_all('a', href=True):
                text = a.get_text(" ", strip=True)
                href = a['href']
                if "tbmm.gov.tr" not in href and not href.startswith("/"):
                    continue
                if not (_metin_alakali(text) or _metin_alakali(href)):
                    continue
                link = href if href.startswith("http") else "https://www.tbmm.gov.tr" + href
                if _pending_zaten_var_mi(link):
                    continue
                try:
                    detay = requests.get(link, timeout=20, headers={'User-Agent': 'Mozilla/5.0'})
                    d_soup = BeautifulSoup(detay.text, 'html.parser')
                    for el in d_soup(["script", "style", "nav", "footer", "header"]):
                        el.decompose()
                    ham = d_soup.get_text("\n", strip=True)
                    if not _metin_alakali(ham) or len(ham) < 300:
                        continue
                    if _pending_ekle(text or "TBMM Kanun/Teklif", link, ham, {"provider": "tbmm"}):
                        yeni += 1
                        print(f"[TBMM] +1: {(text or link)[:80]}")
                except Exception as e:
                    print(f"[TBMM] detay hata: {e}")
        except Exception as e:
            print(f"[TBMM] arama hata: {e}")
    return yeni



kaynaklar = [
    {'url': 'https://karararama.yargitay.gov.tr', 'alan': 'yargitay'},
    {'url': 'https://emsal.yargitay.gov.tr', 'alan': 'yargitay_emsal'},
    {'url': 'https://www.danistay.gov.tr', 'alan': 'danistay'},
    {'url': 'https://www.anayasa.gov.tr/tr/kararlar', 'alan': 'anayasa'},
    {'url': 'https://www.sayistay.gov.tr', 'alan': 'sayistay'},
    {'url': 'https://www.mevzuat.gov.tr', 'alan': 'mevzuat'},
    {'url': 'https://www.resmigazete.gov.tr', 'alan': 'resmi_gazete'},
    {'url': 'https://www.rekabet.gov.tr/tr/Sayfa/kararlar', 'alan': 'rekabet'},
    {'url': 'https://www.kvkk.gov.tr', 'alan': 'kvkk'},
    {'url': 'https://bilirikisilik.adalet.gov.tr', 'alan': 'bilirkisilik'},
    {'url': 'https://www.barobirlik.org.tr', 'alan': 'tbb'},
    {'url': 'https://tbbdergisi.barobirlik.org.tr', 'alan': 'tbb_dergi'},
    {'url': 'https://www.sgk.gov.tr', 'alan': 'sgk'},
    {'url': 'https://www.calisma.gov.tr', 'alan': 'calisma_bakanligi'},
    {'url': 'https://www.gtb.gov.tr', 'alan': 'ticaret_bakanligi'},
    {'url': 'https://tuketici.ticaret.gov.tr', 'alan': 'tuketici'},
    {'url': 'https://www.saglik.gov.tr', 'alan': 'saglik_bakanligi'},
    {'url': 'https://www.tsb.org.tr', 'alan': 'sigorta_birligi'},
    {'url': 'https://www.tse.org.tr', 'alan': 'tse'},
    {'url': 'https://www.turkpatent.gov.tr', 'alan': 'turkpatent'},
    {'url': 'https://dergipark.org.tr', 'alan': 'dergipark'},
    {'url': 'https://dergipark.org.tr/tr/search?q=is+hukuku', 'alan': 'akademik_is_hukuku'},
    {'url': 'https://dergipark.org.tr/tr/search?q=ticaret+hukuku', 'alan': 'akademik_ticaret'},
    {'url': 'https://dergipark.org.tr/tr/search?q=saglik+hukuku', 'alan': 'akademik_saglik'},
    {'url': 'https://dergipark.org.tr/tr/search?q=insaat+hukuku', 'alan': 'akademik_insaat'}
]

if __name__ == "__main__":
    if not GEMINI_API_KEY:
        print("⚠️ UYARI: 'GEMINI_API_KEY' bulunamadı. Lütfen terminale tokenı tanımlayın.")
    else:
        print("🚀 Gemini destekli Veri Avcısı başlatıldı...")
        for kaynak in kaynaklar:
            if "dergipark" in kaynak['url']:
                yeni, atlandi = dergipark_ve_pdf_isle(kaynak)
            else:
                yeni, atlandi = standart_web_isle(kaynak)
            print(f"{kaynak['alan']}: {yeni} yeni veri, {atlandi} atlandı")

        # --- Mevzuat Takibi (Resmi Gazete + TBMM → pending_pool) ---
        try:
            rg = scrape_resmi_gazete()
            print(f"resmi_gazete_mevzuat: {rg} yeni bekleyen kayıt")
        except Exception as e:
            print(f"resmi_gazete_mevzuat hata: {e}")
        try:
            tb = scrape_tbmm()
            print(f"tbmm_mevzuat: {tb} yeni bekleyen kayıt")
        except Exception as e:
            print(f"tbmm_mevzuat hata: {e}")

