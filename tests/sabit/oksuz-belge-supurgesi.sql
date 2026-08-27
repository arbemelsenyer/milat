-- Soru: `case-documents` kovasında hiçbir tabloda karşılığı olmayan (ÖKSÜZ)
-- dosyalar hangileri, ve bunlardan hangileri artık var olmayan bir dosyaya ait?
--
-- ÇALIŞTIRAN: Cowork / kurucu. HAT H-19'un eki.
-- BÖLÜM 1 ve 2 HİÇBİR ŞEY SİLMEZ — yalnız sayar ve listeler.
-- BÖLÜM 3 SİLER ve GERİ ALINAMAZ; kurucu kararı gelmeden çalıştırılmaz.
--
-- NEDEN: 25–26.08'de "önce satır, sonra depo" kusuru kapatıldı ve yeni öksüz
-- üretilmiyor. Bu betik o kusurun GERİDE BIRAKTIĞI birikimi süpürür.
-- constitution m.10 (süresiz saklama yasağı) · HAT H-15/1 (sıfır saklama).

-- Bir yol "sahipli" sayılır: dört kaynaktan biri onu gösteriyorsa.
-- Yeni bir dosya sahibi tablo eklenirse BURAYA DA EKLE; yoksa o tablonun
-- dosyaları öksüz sanılıp silinir.
create or replace view public.v_depo_sahipli_yollar as
  select file_path as yol from public.case_documents      where file_path  is not null
  union select file_path      from public.agreement_documents where file_path  is not null
  union select dosya_yolu     from public.bilirkisi_raporlari  where dosya_yolu is not null
  union select distinct regexp_replace(source_url, '^.*?(admin/knowledge/[^?]*)$', '\1')
        from public.knowledge_base_chunks where source_url like '%admin/knowledge/%';


-- ═══ BÖLÜM 1 · SAYIM (hiçbir şey silmez) ═══════════════════════════════════
select case when o.name like 'admin/knowledge/%' then 'bilgi tabani'
            else 'dosya belgesi' end                                as kume,
       count(*)                                                     as oksuz_adet,
       round(sum(coalesce((o.metadata->>'size')::numeric, 0)) / 1048576, 1) as toplam_mb,
       min(o.created_at)::date                                      as en_eski,
       max(o.created_at)::date                                      as en_yeni
from storage.objects o
where o.bucket_id = 'case-documents'
  and not exists (select 1 from public.v_depo_sahipli_yollar s where s.yol = o.name)
group by 1 order by 1;

-- 27.08.2026'da ölçülen: bilgi tabani 71 · dosya belgesi 6 (toplam 77).


-- ═══ BÖLÜM 2 · DOSYA BELGELERİNİN TAM DÖKÜMÜ (hiçbir şey silmez) ══════════
-- Silmeden önce GÖZLE okunacak liste budur. `dosya_hala_var = false` ise
-- belgenin ait olduğu dosya `cases` tablosundan zaten silinmiştir; belge
-- sahipsizdir ve hiçbir silme kolu onu bulamaz.
select o.name                                              as yol,
       o.created_at::date                                  as yuklendi,
       round(coalesce((o.metadata->>'size')::numeric, 0) / 1024) as kb,
       (split_part(o.name, '/', 1) in (select id::text from public.cases)) as dosya_hala_var
from storage.objects o
where o.bucket_id = 'case-documents'
  and o.name not like 'admin/knowledge/%'
  and not exists (select 1 from public.v_depo_sahipli_yollar s where s.yol = o.name)
order by o.created_at;


-- ═══ BÖLÜM 3 · SİLME — KURUCU KARARI GELMEDEN ÇALIŞTIRMAYIN ═══════════════
-- ⚠ SQL ile `storage.objects` satırını silmek YETMEZ: satır gider, dosyanın
--   kendisi depoda kalır ve bir daha HİÇ bulunamaz — yani düzeltmeye
--   çalıştığımız kusurun tam tersini üretiriz.
--   Silme, depo API'siyle yapılmalıdır (`storage.from(...).remove([...])`).
--
-- DOĞRU YOL: Bölüm 2'nin çıktısındaki yolları `admin-oksuz-supur` benzeri bir
-- kolun gövdesine ver, ya da Lovable ajanına "şu yolları `case-documents`
-- kovasından sil" de. Silme bittikten sonra Bölüm 1'i TEKRAR çalıştır:
-- `dosya belgesi` satırı 0 dönmelidir.
--
-- Kararı ve sonucu `tasks/HAT.md` H-19 maddesine yazın.
