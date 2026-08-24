export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_states: {
        Row: {
          agent_type: string
          case_id: string
          confidence_score: number | null
          created_at: string
          error_message: string | null
          hallucination_risk: boolean
          id: string
          last_output: Json | null
          party_id: string | null
          status: string
          tarafa_gorunur: boolean
          updated_at: string
        }
        Insert: {
          agent_type: string
          case_id: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          hallucination_risk?: boolean
          id?: string
          last_output?: Json | null
          party_id?: string | null
          status?: string
          tarafa_gorunur?: boolean
          updated_at?: string
        }
        Update: {
          agent_type?: string
          case_id?: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          hallucination_risk?: boolean
          id?: string
          last_output?: Json | null
          party_id?: string | null
          status?: string
          tarafa_gorunur?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_states_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "agent_states_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_states_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_worklog: {
        Row: {
          agent_type: string
          case_id: string
          content: Json
          created_at: string
          entry_type: string
          id: string
          party_id: string | null
        }
        Insert: {
          agent_type: string
          case_id: string
          content: Json
          created_at?: string
          entry_type: string
          id?: string
          party_id?: string | null
        }
        Update: {
          agent_type?: string
          case_id?: string
          content?: Json
          created_at?: string
          entry_type?: string
          id?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_worklog_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "agent_worklog_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_worklog_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_documents: {
        Row: {
          case_id: string
          created_at: string
          doc_type: string
          file_path: string | null
          id: string
          metadata: Json
          signed_by: string[]
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          doc_type: string
          file_path?: string | null
          id?: string
          metadata?: Json
          signed_by?: string[]
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          metadata?: Json
          signed_by?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "agreement_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ajan_bellek: {
        Row: {
          anahtar: string
          case_id: string
          created_at: string
          deger: Json
          guncelleme_zamani: string
          id: string
          party_id: string | null
        }
        Insert: {
          anahtar: string
          case_id: string
          created_at?: string
          deger?: Json
          guncelleme_zamani?: string
          id?: string
          party_id?: string | null
        }
        Update: {
          anahtar?: string
          case_id?: string
          created_at?: string
          deger?: Json
          guncelleme_zamani?: string
          id?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajan_bellek_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "ajan_bellek_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajan_bellek_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      ajan_deneyim: {
        Row: {
          adim: string
          case_id: string | null
          created_at: string
          deneme_no: number | null
          hata_kodu: string | null
          id: string
          mediator_id: string | null
          sonuc: string
          sure_ms: number | null
          yol: string | null
        }
        Insert: {
          adim: string
          case_id?: string | null
          created_at?: string
          deneme_no?: number | null
          hata_kodu?: string | null
          id?: string
          mediator_id?: string | null
          sonuc: string
          sure_ms?: number | null
          yol?: string | null
        }
        Update: {
          adim?: string
          case_id?: string | null
          created_at?: string
          deneme_no?: number | null
          hata_kodu?: string | null
          id?: string
          mediator_id?: string | null
          sonuc?: string
          sure_ms?: number | null
          yol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajan_deneyim_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "ajan_deneyim_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ajan_gorevleri: {
        Row: {
          bekleyen: string | null
          case_id: string
          created_at: string
          durum: string
          gerekce: string | null
          gorev_tipi: string
          hedef_party_id: string | null
          id: string
          kaynak: string | null
          sonuc: string | null
          updated_at: string
        }
        Insert: {
          bekleyen?: string | null
          case_id: string
          created_at?: string
          durum?: string
          gerekce?: string | null
          gorev_tipi: string
          hedef_party_id?: string | null
          id?: string
          kaynak?: string | null
          sonuc?: string | null
          updated_at?: string
        }
        Update: {
          bekleyen?: string | null
          case_id?: string
          created_at?: string
          durum?: string
          gerekce?: string | null
          gorev_tipi?: string
          hedef_party_id?: string | null
          id?: string
          kaynak?: string | null
          sonuc?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajan_gorevleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "ajan_gorevleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ajan_kosum_izi: {
        Row: {
          case_id: string
          created_at: string
          durum: string
          girdi_imzasi: string
          id: string
          kol: string
          kosum_zamani: string
          sebep: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          durum?: string
          girdi_imzasi?: string
          id?: string
          kol: string
          kosum_zamani?: string
          sebep?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          durum?: string
          girdi_imzasi?: string
          id?: string
          kol?: string
          kosum_zamani?: string
          sebep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajan_kosum_izi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "ajan_kosum_izi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ajan_onerileri: {
        Row: {
          baslik: string
          case_id: string
          created_at: string
          durum: string
          eylem_adim: string | null
          eylem_turu: string
          gerekce: string | null
          hedef: string
          id: string
          karar_zamani: string | null
          party_id: string | null
        }
        Insert: {
          baslik: string
          case_id: string
          created_at?: string
          durum?: string
          eylem_adim?: string | null
          eylem_turu?: string
          gerekce?: string | null
          hedef: string
          id?: string
          karar_zamani?: string | null
          party_id?: string | null
        }
        Update: {
          baslik?: string
          case_id?: string
          created_at?: string
          durum?: string
          eylem_adim?: string | null
          eylem_turu?: string
          gerekce?: string | null
          hedef?: string
          id?: string
          karar_zamani?: string | null
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ajan_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "ajan_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajan_onerileri_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      akis_duraklatma: {
        Row: {
          aktif: boolean
          case_id: string
          created_at: string
          duraklatan: string | null
          hedef_adim: string | null
          id: string
          kaldiran: string | null
          kaldirma_zamani: string | null
          kapsam: string
          sebep: string | null
        }
        Insert: {
          aktif?: boolean
          case_id: string
          created_at?: string
          duraklatan?: string | null
          hedef_adim?: string | null
          id?: string
          kaldiran?: string | null
          kaldirma_zamani?: string | null
          kapsam?: string
          sebep?: string | null
        }
        Update: {
          aktif?: boolean
          case_id?: string
          created_at?: string
          duraklatan?: string | null
          hedef_adim?: string | null
          id?: string
          kaldiran?: string | null
          kaldirma_zamani?: string | null
          kapsam?: string
          sebep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akis_duraklatma_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "akis_duraklatma_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      akis_kurallari: {
        Row: {
          created_at: string
          etkin: boolean
          gerekce: string | null
          id: string
          insan_kapisi: boolean
          kod: string
          kosul: Json
          olay_kodu: string
          sahip: string
          sira: number
          sonraki_adim: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          etkin?: boolean
          gerekce?: string | null
          id?: string
          insan_kapisi?: boolean
          kod: string
          kosul?: Json
          olay_kodu: string
          sahip: string
          sira?: number
          sonraki_adim: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          etkin?: boolean
          gerekce?: string | null
          id?: string
          insan_kapisi?: boolean
          kod?: string
          kosul?: Json
          olay_kodu?: string
          sahip?: string
          sira?: number
          sonraki_adim?: string
          updated_at?: string
        }
        Relationships: []
      }
      akis_olaylari: {
        Row: {
          case_id: string
          created_at: string
          id: string
          islendi: boolean
          islenme_zamani: string | null
          olay_kodu: string
          party_id: string | null
          veri: Json
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          islendi?: boolean
          islenme_zamani?: string | null
          olay_kodu: string
          party_id?: string | null
          veri?: Json
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          islendi?: boolean
          islenme_zamani?: string | null
          olay_kodu?: string
          party_id?: string | null
          veri?: Json
        }
        Relationships: [
          {
            foreignKeyName: "akis_olaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "akis_olaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akis_olaylari_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      arabulucu_aliskanliklari: {
        Row: {
          anahtar: string
          guncelleme_zamani: string
          id: string
          mediator_id: string
          sayac: number
          son_deger: string | null
        }
        Insert: {
          anahtar: string
          guncelleme_zamani?: string
          id?: string
          mediator_id: string
          sayac?: number
          son_deger?: string | null
        }
        Update: {
          anahtar?: string
          guncelleme_zamani?: string
          id?: string
          mediator_id?: string
          sayac?: number
          son_deger?: string | null
        }
        Relationships: []
      }
      arabulucu_kontrol_tercihleri: {
        Row: {
          aciklama_surumu: string
          case_id: string
          guncelleme_zamani: string
          id: string
          mediator_id: string
          onay_isteyen_adimlar: string[]
          secim_zamani: string
        }
        Insert: {
          aciklama_surumu?: string
          case_id: string
          guncelleme_zamani?: string
          id?: string
          mediator_id: string
          onay_isteyen_adimlar?: string[]
          secim_zamani?: string
        }
        Update: {
          aciklama_surumu?: string
          case_id?: string
          guncelleme_zamani?: string
          id?: string
          mediator_id?: string
          onay_isteyen_adimlar?: string[]
          secim_zamani?: string
        }
        Relationships: [
          {
            foreignKeyName: "arabulucu_kontrol_tercihleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "arabulucu_kontrol_tercihleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      arabulucu_talimatlari: {
        Row: {
          case_id: string
          created_at: string
          durum: string
          hedef_adim: string
          id: string
          karar_zamani: string | null
          red_sebebi: string | null
          sonuc_ozeti: string | null
          talimat: string
          uygulanma_zamani: string | null
          veren: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          durum?: string
          hedef_adim: string
          id?: string
          karar_zamani?: string | null
          red_sebebi?: string | null
          sonuc_ozeti?: string | null
          talimat: string
          uygulanma_zamani?: string | null
          veren?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          durum?: string
          hedef_adim?: string
          id?: string
          karar_zamani?: string | null
          red_sebebi?: string | null
          sonuc_ozeti?: string | null
          talimat?: string
          uygulanma_zamani?: string | null
          veren?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arabulucu_talimatlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "arabulucu_talimatlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      belge_ozetleri: {
        Row: {
          case_id: string
          created_at: string
          document_id: string
          durum: string
          id: string
          kaniti: string | null
          ozet: string | null
          sebep: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          document_id: string
          durum?: string
          id?: string
          kaniti?: string | null
          ozet?: string | null
          sebep?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          document_id?: string
          durum?: string
          id?: string
          kaniti?: string | null
          ozet?: string | null
          sebep?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "belge_ozetleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "belge_ozetleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "belge_ozetleri_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bilirkisi_evrak_kumesi: {
        Row: {
          case_id: string
          created_at: string
          document_id: string
          expert_id: string
          gerekce: string | null
          id: string
          onay_zamani: string | null
          onaylandi: boolean
          onaylayan: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          document_id: string
          expert_id: string
          gerekce?: string | null
          id?: string
          onay_zamani?: string | null
          onaylandi?: boolean
          onaylayan?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          document_id?: string
          expert_id?: string
          gerekce?: string | null
          id?: string
          onay_zamani?: string | null
          onaylandi?: boolean
          onaylayan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bilirkisi_evrak_kumesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "bilirkisi_evrak_kumesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_evrak_kumesi_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_evrak_kumesi_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      bilirkisi_onerileri: {
        Row: {
          alan: string | null
          arabulucu_onay_zamani: string | null
          arabulucu_onayi: boolean
          arabulucu_secimi: boolean
          case_id: string
          created_at: string
          durum: string
          eslesme_gerekcesi: string
          expert_id: string
          id: string
          oneren: string
          oneren_party_id: string | null
          sira: number
        }
        Insert: {
          alan?: string | null
          arabulucu_onay_zamani?: string | null
          arabulucu_onayi?: boolean
          arabulucu_secimi?: boolean
          case_id: string
          created_at?: string
          durum?: string
          eslesme_gerekcesi: string
          expert_id: string
          id?: string
          oneren: string
          oneren_party_id?: string | null
          sira?: number
        }
        Update: {
          alan?: string | null
          arabulucu_onay_zamani?: string | null
          arabulucu_onayi?: boolean
          arabulucu_secimi?: boolean
          case_id?: string
          created_at?: string
          durum?: string
          eslesme_gerekcesi?: string
          expert_id?: string
          id?: string
          oneren?: string
          oneren_party_id?: string | null
          sira?: number
        }
        Relationships: [
          {
            foreignKeyName: "bilirkisi_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "bilirkisi_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_onerileri_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_onerileri_oneren_party_id_fkey"
            columns: ["oneren_party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      bilirkisi_raporlari: {
        Row: {
          alan: string | null
          case_id: string
          created_at: string
          dosya_yolu: string | null
          durum: string
          expert_id: string
          id: string
          rapor_metni: string | null
          teslim_zamani: string | null
        }
        Insert: {
          alan?: string | null
          case_id: string
          created_at?: string
          dosya_yolu?: string | null
          durum?: string
          expert_id: string
          id?: string
          rapor_metni?: string | null
          teslim_zamani?: string | null
        }
        Update: {
          alan?: string | null
          case_id?: string
          created_at?: string
          dosya_yolu?: string | null
          durum?: string
          expert_id?: string
          id?: string
          rapor_metni?: string | null
          teslim_zamani?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bilirkisi_raporlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "bilirkisi_raporlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_raporlari_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      bilirkisi_secim_beyani: {
        Row: {
          case_id: string
          created_at: string
          id: string
          masraf_kabul: boolean
          party_id: string
          secim_yontemi: string
          tikanma_halinde_arabulucu: boolean
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          masraf_kabul?: boolean
          party_id: string
          secim_yontemi: string
          tikanma_halinde_arabulucu?: boolean
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          masraf_kabul?: boolean
          party_id?: string
          secim_yontemi?: string
          tikanma_halinde_arabulucu?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bilirkisi_secim_beyani_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "bilirkisi_secim_beyani_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_secim_beyani_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      bilirkisi_taraf_yanitlari: {
        Row: {
          alan: string | null
          case_id: string
          created_at: string
          expert_id: string
          gosterim_izni: boolean
          id: string
          not_metni: string | null
          party_id: string
          yanit: string
        }
        Insert: {
          alan?: string | null
          case_id: string
          created_at?: string
          expert_id: string
          gosterim_izni?: boolean
          id?: string
          not_metni?: string | null
          party_id: string
          yanit: string
        }
        Update: {
          alan?: string | null
          case_id?: string
          created_at?: string
          expert_id?: string
          gosterim_izni?: boolean
          id?: string
          not_metni?: string | null
          party_id?: string
          yanit?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilirkisi_taraf_yanitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "bilirkisi_taraf_yanitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_taraf_yanitlari_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bilirkisi_taraf_yanitlari_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      blind_bids: {
        Row: {
          case_id: string
          created_at: string
          currency: string
          id: string
          max_amount: number | null
          min_amount: number | null
          note: string | null
          party_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          currency?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          note?: string | null
          party_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          currency?: string
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          note?: string | null
          party_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blind_bids_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "blind_bids_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blind_bids_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      braket_bant_sorulari: {
        Row: {
          bant_alt: number
          bant_ust: number
          case_id: string
          cevap_at: string | null
          created_at: string
          durum: string
          hedef_party_id: string
          id: string
          islendi_at: string | null
          kaynak_braket_id: string
          para_birimi: string
        }
        Insert: {
          bant_alt: number
          bant_ust: number
          case_id: string
          cevap_at?: string | null
          created_at?: string
          durum?: string
          hedef_party_id: string
          id?: string
          islendi_at?: string | null
          kaynak_braket_id: string
          para_birimi?: string
        }
        Update: {
          bant_alt?: number
          bant_ust?: number
          case_id?: string
          cevap_at?: string | null
          created_at?: string
          durum?: string
          hedef_party_id?: string
          id?: string
          islendi_at?: string | null
          kaynak_braket_id?: string
          para_birimi?: string
        }
        Relationships: [
          {
            foreignKeyName: "braket_bant_sorulari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "braket_bant_sorulari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "braket_bant_sorulari_hedef_party_id_fkey"
            columns: ["hedef_party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "braket_bant_sorulari_kaynak_braket_id_fkey"
            columns: ["kaynak_braket_id"]
            isOneToOne: false
            referencedRelation: "teklif_braketleri"
            referencedColumns: ["id"]
          },
        ]
      }
      braket_denetim_izi: {
        Row: {
          case_id: string
          created_at: string
          detay: Json
          id: string
          olay: string
          party_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          detay?: Json
          id?: string
          olay: string
          party_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          detay?: Json
          id?: string
          olay?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "braket_denetim_izi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "braket_denetim_izi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "braket_denetim_izi_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          case_id: string
          id: string
          mediator_id: string
          note: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          case_id: string
          id?: string
          mediator_id: string
          note?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          case_id?: string
          id?: string
          mediator_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_discovery_questions: {
        Row: {
          answer_text: string | null
          case_id: string
          created_at: string
          detected_need: string | null
          id: string
          party_id: string | null
          question_order: number
          question_text: string
          updated_at: string
          user_id: string | null
          win_win_scenario: string | null
        }
        Insert: {
          answer_text?: string | null
          case_id: string
          created_at?: string
          detected_need?: string | null
          id?: string
          party_id?: string | null
          question_order?: number
          question_text: string
          updated_at?: string
          user_id?: string | null
          win_win_scenario?: string | null
        }
        Update: {
          answer_text?: string | null
          case_id?: string
          created_at?: string
          detected_need?: string | null
          id?: string
          party_id?: string | null
          question_order?: number
          question_text?: string
          updated_at?: string
          user_id?: string | null
          win_win_scenario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_discovery_questions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_discovery_questions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_discovery_questions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          analysis_result: Json | null
          case_id: string
          created_at: string
          extracted_text: string | null
          extraction_status: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          party_id: string | null
          uploaded_by: string
        }
        Insert: {
          analysis_result?: Json | null
          case_id: string
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          party_id?: string | null
          uploaded_by: string
        }
        Update: {
          analysis_result?: Json | null
          case_id?: string
          created_at?: string
          extracted_text?: string | null
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          party_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_expert_assignments: {
        Row: {
          approvals: Json
          assigned_by: string
          case_id: string
          created_at: string
          expert_id: string
          id: string
          note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approvals?: Json
          assigned_by: string
          case_id: string
          created_at?: string
          expert_id: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approvals?: Json
          assigned_by?: string
          case_id?: string
          created_at?: string
          expert_id?: string
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_expert_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_expert_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_expert_assignments_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      case_fees: {
        Row: {
          ai_breakdown: Json | null
          calculated_fee: number
          case_id: string
          created_at: string
          dispute_value: number
          fee_type: string
          id: string
          invoice_generated: boolean
          notes: string | null
          session_count: number
          tarife_maddesi: string | null
          tarife_yili: number
          total_fee: number
          updated_at: string
          vat_amount: number
        }
        Insert: {
          ai_breakdown?: Json | null
          calculated_fee?: number
          case_id: string
          created_at?: string
          dispute_value?: number
          fee_type: string
          id?: string
          invoice_generated?: boolean
          notes?: string | null
          session_count?: number
          tarife_maddesi?: string | null
          tarife_yili?: number
          total_fee?: number
          updated_at?: string
          vat_amount?: number
        }
        Update: {
          ai_breakdown?: Json | null
          calculated_fee?: number
          case_id?: string
          created_at?: string
          dispute_value?: number
          fee_type?: string
          id?: string
          invoice_generated?: boolean
          notes?: string | null
          session_count?: number
          tarife_maddesi?: string | null
          tarife_yili?: number
          total_fee?: number
          updated_at?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_fees_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_fees_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          case_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          phase: number
          updated_at: string
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          phase: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          phase?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_parties: {
        Row: {
          address: string | null
          authorized_person: string | null
          birth_date: string | null
          case_id: string
          company_name: string | null
          contact_info: string | null
          created_at: string
          email: string | null
          email_confirmed_at: string | null
          first_name: string | null
          full_name: string | null
          gsm: string | null
          hatirlatma_izni: boolean
          id: string
          invite_status: string
          is_individual: boolean
          katilim_durumu: string
          katilim_token: string | null
          katilim_zamani: string | null
          last_name: string | null
          organization: string | null
          otomatik_onay: boolean
          party_role: string | null
          party_type: string
          phone: string | null
          role: string
          statement: string | null
          tax_number: string | null
          tax_office: string | null
          tc_kimlik: string | null
          trade_registry_no: string | null
          user_id: string | null
          vekil_ad_soyad: string | null
          vekil_baro: string | null
          vekil_sicil_no: string | null
        }
        Insert: {
          address?: string | null
          authorized_person?: string | null
          birth_date?: string | null
          case_id: string
          company_name?: string | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          email_confirmed_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gsm?: string | null
          hatirlatma_izni?: boolean
          id?: string
          invite_status?: string
          is_individual?: boolean
          katilim_durumu?: string
          katilim_token?: string | null
          katilim_zamani?: string | null
          last_name?: string | null
          organization?: string | null
          otomatik_onay?: boolean
          party_role?: string | null
          party_type?: string
          phone?: string | null
          role: string
          statement?: string | null
          tax_number?: string | null
          tax_office?: string | null
          tc_kimlik?: string | null
          trade_registry_no?: string | null
          user_id?: string | null
          vekil_ad_soyad?: string | null
          vekil_baro?: string | null
          vekil_sicil_no?: string | null
        }
        Update: {
          address?: string | null
          authorized_person?: string | null
          birth_date?: string | null
          case_id?: string
          company_name?: string | null
          contact_info?: string | null
          created_at?: string
          email?: string | null
          email_confirmed_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gsm?: string | null
          hatirlatma_izni?: boolean
          id?: string
          invite_status?: string
          is_individual?: boolean
          katilim_durumu?: string
          katilim_token?: string | null
          katilim_zamani?: string | null
          last_name?: string | null
          organization?: string | null
          otomatik_onay?: boolean
          party_role?: string | null
          party_type?: string
          phone?: string | null
          role?: string
          statement?: string | null
          tax_number?: string | null
          tax_office?: string | null
          tc_kimlik?: string | null
          trade_registry_no?: string | null
          user_id?: string | null
          vekil_ad_soyad?: string | null
          vekil_baro?: string | null
          vekil_sicil_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_parties_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_party_invites: {
        Row: {
          accepted_at: string | null
          case_party_id: string
          created_at: string
          id: string
          invite_status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          case_party_id: string
          created_at?: string
          id?: string
          invite_status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          case_party_id?: string
          created_at?: string
          id?: string
          invite_status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_party_invites_case_party_id_fkey"
            columns: ["case_party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_payments: {
        Row: {
          amount: number
          case_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          notes: string | null
          paid_at: string | null
          party_id: string | null
          payer_label: string
          payer_party_id: string | null
          payer_type: string
          payment_date: string
          receipt_no: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          case_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          party_id?: string | null
          payer_label?: string
          payer_party_id?: string | null
          payer_type?: string
          payment_date?: string
          receipt_no?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          party_id?: string | null
          payer_label?: string
          payer_party_id?: string | null
          payer_type?: string
          payment_date?: string
          receipt_no?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_payments_payer_party_id_fkey"
            columns: ["payer_party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      case_process_tracker: {
        Row: {
          arb_no: string | null
          buro_no: string | null
          case_id: string
          items: Json
          updated_at: string
        }
        Insert: {
          arb_no?: string | null
          buro_no?: string | null
          case_id: string
          items?: Json
          updated_at?: string
        }
        Update: {
          arb_no?: string | null
          buro_no?: string | null
          case_id?: string
          items?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_process_tracker_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_process_tracker_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_sessions: {
        Row: {
          case_id: string
          created_at: string
          id: string
          invite_sent_at: string | null
          kayitli: boolean
          meeting_type: string
          notes: string | null
          participants: Json
          prep_notes_generated: boolean
          scheduled_at: string | null
          session_type: string
          status: string
          updated_at: string
          video_link: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          invite_sent_at?: string | null
          kayitli?: boolean
          meeting_type?: string
          notes?: string | null
          participants?: Json
          prep_notes_generated?: boolean
          scheduled_at?: string | null
          session_type: string
          status?: string
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          invite_sent_at?: string | null
          kayitli?: boolean
          meeting_type?: string
          notes?: string | null
          participants?: Json
          prep_notes_generated?: boolean
          scheduled_at?: string | null
          session_type?: string
          status?: string
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          additional_notes: string | null
          agreement_amount: number | null
          agreement_terms: string | null
          ai_summary: Json | null
          application_date: string
          application_no: string | null
          assigned_expert_id: string | null
          assigned_mediator_id: string | null
          attempted_resolution: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          current_phase: number
          deadline_conflict: boolean | null
          deadline_conflict_note: string | null
          deadline_detected_at: string | null
          deadline_extended: string | null
          deadline_sources: Json | null
          deadline_total: string | null
          deadline_warning_sent: boolean
          desired_outcome: string | null
          dispute_subtype: string | null
          dispute_type: string | null
          dispute_type_other: string | null
          extension_days: number | null
          extension_used: boolean
          id: string
          is_mandatory: boolean | null
          issue_description: string | null
          kararlastirilan_ucret: number | null
          legal_basis: string | null
          legal_duration_days: number | null
          mahkeme_turu: string | null
          mediation_type: string | null
          open_to_compromise: boolean | null
          other_party_name: string | null
          other_party_role: string | null
          otomatik_akis: boolean
          outcome: string | null
          priorities: string[] | null
          relationship: string | null
          round_number: number
          status: string
          sure_hafta: number | null
          timeline: string | null
          title: string | null
          ucret_sozlesmesi: boolean
          updated_at: string
          user_id: string
          uyap_no: string | null
          uzatma_hafta: number | null
          your_name: string | null
          your_role: string | null
        }
        Insert: {
          additional_notes?: string | null
          agreement_amount?: number | null
          agreement_terms?: string | null
          ai_summary?: Json | null
          application_date?: string
          application_no?: string | null
          assigned_expert_id?: string | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          current_phase?: number
          deadline_conflict?: boolean | null
          deadline_conflict_note?: string | null
          deadline_detected_at?: string | null
          deadline_extended?: string | null
          deadline_sources?: Json | null
          deadline_total?: string | null
          deadline_warning_sent?: boolean
          desired_outcome?: string | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          extension_days?: number | null
          extension_used?: boolean
          id?: string
          is_mandatory?: boolean | null
          issue_description?: string | null
          kararlastirilan_ucret?: number | null
          legal_basis?: string | null
          legal_duration_days?: number | null
          mahkeme_turu?: string | null
          mediation_type?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          otomatik_akis?: boolean
          outcome?: string | null
          priorities?: string[] | null
          relationship?: string | null
          round_number?: number
          status?: string
          sure_hafta?: number | null
          timeline?: string | null
          title?: string | null
          ucret_sozlesmesi?: boolean
          updated_at?: string
          user_id?: string
          uyap_no?: string | null
          uzatma_hafta?: number | null
          your_name?: string | null
          your_role?: string | null
        }
        Update: {
          additional_notes?: string | null
          agreement_amount?: number | null
          agreement_terms?: string | null
          ai_summary?: Json | null
          application_date?: string
          application_no?: string | null
          assigned_expert_id?: string | null
          assigned_mediator_id?: string | null
          attempted_resolution?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          current_phase?: number
          deadline_conflict?: boolean | null
          deadline_conflict_note?: string | null
          deadline_detected_at?: string | null
          deadline_extended?: string | null
          deadline_sources?: Json | null
          deadline_total?: string | null
          deadline_warning_sent?: boolean
          desired_outcome?: string | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          dispute_type_other?: string | null
          extension_days?: number | null
          extension_used?: boolean
          id?: string
          is_mandatory?: boolean | null
          issue_description?: string | null
          kararlastirilan_ucret?: number | null
          legal_basis?: string | null
          legal_duration_days?: number | null
          mahkeme_turu?: string | null
          mediation_type?: string | null
          open_to_compromise?: boolean | null
          other_party_name?: string | null
          other_party_role?: string | null
          otomatik_akis?: boolean
          outcome?: string | null
          priorities?: string[] | null
          relationship?: string | null
          round_number?: number
          status?: string
          sure_hafta?: number | null
          timeline?: string | null
          title?: string | null
          ucret_sozlesmesi?: boolean
          updated_at?: string
          user_id?: string
          uyap_no?: string | null
          uzatma_hafta?: number | null
          your_name?: string | null
          your_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_expert_id_fkey"
            columns: ["assigned_expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      cases_private_keys: {
        Row: {
          case_id: string
          created_at: string
          encrypted_value: string
          field_type: string | null
          id: string
          mask_label: string
        }
        Insert: {
          case_id: string
          created_at?: string
          encrypted_value: string
          field_type?: string | null
          id?: string
          mask_label: string
        }
        Update: {
          case_id?: string
          created_at?: string
          encrypted_value?: string
          field_type?: string | null
          id?: string
          mask_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_private_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "cases_private_keys_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases_vector_pool: {
        Row: {
          anonymized_text: string
          case_id: string
          created_at: string
          embedding: string | null
          id: string
          niche_area: string | null
        }
        Insert: {
          anonymized_text: string
          case_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          niche_area?: string | null
        }
        Update: {
          anonymized_text?: string
          case_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          niche_area?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_vector_pool_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "cases_vector_pool_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      common_ground_reports: {
        Row: {
          case_id: string
          created_at: string
          id: string
          report: Json
          risk_ozeti: Json | null
          round_number: number
          strategy: Json
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          report?: Json
          risk_ozeti?: Json | null
          round_number?: number
          strategy?: Json
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          report?: Json
          risk_ozeti?: Json | null
          round_number?: number
          strategy?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "common_ground_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "common_ground_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          source_url: string | null
          template_content: string | null
          template_type: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_url?: string | null
          template_content?: string | null
          template_type: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          source_url?: string | null
          template_content?: string | null
          template_type?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      dosya_kapanis: {
        Row: {
          case_id: string
          created_at: string
          eksik_notu: string | null
          id: string
          kontrol_soruldu: boolean
          onay_verildi: boolean
          onay_zamani: string | null
          paket_alindi: boolean
          paket_zamani: string | null
          silen: string | null
          silme_zamani: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          eksik_notu?: string | null
          id?: string
          kontrol_soruldu?: boolean
          onay_verildi?: boolean
          onay_zamani?: string | null
          paket_alindi?: boolean
          paket_zamani?: string | null
          silen?: string | null
          silme_zamani?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          eksik_notu?: string | null
          id?: string
          kontrol_soruldu?: boolean
          onay_verildi?: boolean
          onay_zamani?: string | null
          paket_alindi?: boolean
          paket_zamani?: string | null
          silen?: string | null
          silme_zamani?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dosya_kapanis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "dosya_kapanis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      duzeltme_kayitlari: {
        Row: {
          adim: string
          case_id: string | null
          created_at: string
          duzeltme_turu: string
          id: string
          mediator_id: string | null
        }
        Insert: {
          adim: string
          case_id?: string | null
          created_at?: string
          duzeltme_turu: string
          id?: string
          mediator_id?: string | null
        }
        Update: {
          adim?: string
          case_id?: string | null
          created_at?: string
          duzeltme_turu?: string
          id?: string
          mediator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duzeltme_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "duzeltme_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      elverislilik_kontrol: {
        Row: {
          bulgular: Json
          case_id: string
          created_at: string
          durum: string
          id: string
          kaynaklar: string | null
          updated_at: string
        }
        Insert: {
          bulgular?: Json
          case_id: string
          created_at?: string
          durum?: string
          id?: string
          kaynaklar?: string | null
          updated_at?: string
        }
        Update: {
          bulgular?: Json
          case_id?: string
          created_at?: string
          durum?: string
          id?: string
          kaynaklar?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elverislilik_kontrol_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "elverislilik_kontrol_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_assignment_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          assignment_id: string | null
          case_id: string
          created_at: string
          details: Json
          expert_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          assignment_id?: string | null
          case_id: string
          created_at?: string
          details?: Json
          expert_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          assignment_id?: string | null
          case_id?: string
          created_at?: string
          details?: Json
          expert_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_assignment_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "expert_assignment_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          active: boolean
          bio: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          niche_area: string
          phone: string | null
          rating: number | null
          specialization: string
          title: string | null
          updated_at: string
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          niche_area: string
          phone?: string | null
          rating?: number | null
          specialization: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          niche_area?: string
          phone?: string | null
          rating?: number | null
          specialization?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      fee_tariffs: {
        Row: {
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean
          tariff_data: Json
          updated_at: string
          yil: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          is_active?: boolean
          tariff_data: Json
          updated_at?: string
          yil: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          tariff_data?: Json
          updated_at?: string
          yil?: number
        }
        Relationships: []
      }
      foy_gonderim_kayitlari: {
        Row: {
          attempt: number
          case_id: string
          created_at: string
          error_message: string | null
          foy_id: string
          id: string
          party_id: string
          recipient_email: string
          resend_message_id: string | null
          status: string
        }
        Insert: {
          attempt?: number
          case_id: string
          created_at?: string
          error_message?: string | null
          foy_id: string
          id?: string
          party_id: string
          recipient_email: string
          resend_message_id?: string | null
          status: string
        }
        Update: {
          attempt?: number
          case_id?: string
          created_at?: string
          error_message?: string | null
          foy_id?: string
          id?: string
          party_id?: string
          recipient_email?: string
          resend_message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "foy_gonderim_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "foy_gonderim_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foy_gonderim_kayitlari_foy_id_fkey"
            columns: ["foy_id"]
            isOneToOne: false
            referencedRelation: "oturum_hazirlik_foyleri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foy_gonderim_kayitlari_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      guc_dengesi: {
        Row: {
          aciklama: string
          baslik: string
          case_id: string
          created_at: string
          dayanak: string
          gosterge_tipi: string
          id: string
          sira: number
        }
        Insert: {
          aciklama: string
          baslik: string
          case_id: string
          created_at?: string
          dayanak: string
          gosterge_tipi: string
          id?: string
          sira?: number
        }
        Update: {
          aciklama?: string
          baslik?: string
          case_id?: string
          created_at?: string
          dayanak?: string
          gosterge_tipi?: string
          id?: string
          sira?: number
        }
        Relationships: [
          {
            foreignKeyName: "guc_dengesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "guc_dengesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      gundem_kalem_havuzu: {
        Row: {
          baslik: string
          created_at: string
          durum: string
          id: string
          ipuclari: string[]
          kategori: string
          kaynak_alinti: string | null
          kaynak_source_title: string | null
        }
        Insert: {
          baslik: string
          created_at?: string
          durum?: string
          id?: string
          ipuclari?: string[]
          kategori: string
          kaynak_alinti?: string | null
          kaynak_source_title?: string | null
        }
        Update: {
          baslik?: string
          created_at?: string
          durum?: string
          id?: string
          ipuclari?: string[]
          kategori?: string
          kaynak_alinti?: string | null
          kaynak_source_title?: string | null
        }
        Relationships: []
      }
      iletisim_degisim: {
        Row: {
          alinti_ilk: string
          alinti_son: string
          case_id: string
          created_at: string
          durum: string
          id: string
          kaynak_ilk: string | null
          kaynak_son: string | null
          paragraf: string
          party_id: string
          sebep: string | null
          tarih_ilk: string | null
          tarih_son: string | null
          updated_at: string
        }
        Insert: {
          alinti_ilk?: string
          alinti_son?: string
          case_id: string
          created_at?: string
          durum?: string
          id?: string
          kaynak_ilk?: string | null
          kaynak_son?: string | null
          paragraf?: string
          party_id: string
          sebep?: string | null
          tarih_ilk?: string | null
          tarih_son?: string | null
          updated_at?: string
        }
        Update: {
          alinti_ilk?: string
          alinti_son?: string
          case_id?: string
          created_at?: string
          durum?: string
          id?: string
          kaynak_ilk?: string | null
          kaynak_son?: string | null
          paragraf?: string
          party_id?: string
          sebep?: string | null
          tarih_ilk?: string | null
          tarih_son?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iletisim_degisim_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "iletisim_degisim_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iletisim_degisim_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      iletisim_tercihleri: {
        Row: {
          case_id: string
          created_at: string
          id: string
          kanal: string
          party_id: string
          sessiz_baslangic: string | null
          sessiz_bitis: string | null
          siklik: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          kanal?: string
          party_id: string
          sessiz_baslangic?: string | null
          sessiz_bitis?: string | null
          siklik?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          kanal?: string
          party_id?: string
          sessiz_baslangic?: string | null
          sessiz_bitis?: string | null
          siklik?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iletisim_tercihleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "iletisim_tercihleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iletisim_tercihleri_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      kayit_onay_talepleri: {
        Row: {
          case_id: string
          created_at: string
          gonderen_user_id: string | null
          gonderim_zamani: string
          id: string
          iptal_zamani: string | null
          metin_surumu: string
        }
        Insert: {
          case_id: string
          created_at?: string
          gonderen_user_id?: string | null
          gonderim_zamani?: string
          id?: string
          iptal_zamani?: string | null
          metin_surumu?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          gonderen_user_id?: string | null
          gonderim_zamani?: string
          id?: string
          iptal_zamani?: string | null
          metin_surumu?: string
        }
        Relationships: [
          {
            foreignKeyName: "kayit_onay_talepleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "kayit_onay_talepleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      kayit_onaylari: {
        Row: {
          case_id: string
          created_at: string
          dayanak: string | null
          durum: string
          id: string
          karar_zamani: string
          katilimci_adi: string | null
          katilimci_anahtari: string
          katilimci_tipi: string
          kaydeden_user_id: string | null
          metin_surumu: string
          party_id: string | null
          talep_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          dayanak?: string | null
          durum: string
          id?: string
          karar_zamani?: string
          katilimci_adi?: string | null
          katilimci_anahtari: string
          katilimci_tipi: string
          kaydeden_user_id?: string | null
          metin_surumu?: string
          party_id?: string | null
          talep_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          dayanak?: string | null
          durum?: string
          id?: string
          karar_zamani?: string
          katilimci_adi?: string | null
          katilimci_anahtari?: string
          katilimci_tipi?: string
          kaydeden_user_id?: string | null
          metin_surumu?: string
          party_id?: string | null
          talep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kayit_onaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "kayit_onaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kayit_onaylari_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kayit_onaylari_talep_id_fkey"
            columns: ["talep_id"]
            isOneToOne: false
            referencedRelation: "kayit_onay_talepleri"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_chunks: {
        Row: {
          alan: string | null
          category: string
          chunk_index: number
          chunk_text: string
          created_at: string
          embedding: string | null
          id: string
          katman: string | null
          metadata: Json
          source_title: string
          source_url: string
        }
        Insert: {
          alan?: string | null
          category?: string
          chunk_index?: number
          chunk_text: string
          created_at?: string
          embedding?: string | null
          id?: string
          katman?: string | null
          metadata?: Json
          source_title: string
          source_url: string
        }
        Update: {
          alan?: string | null
          category?: string
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          embedding?: string | null
          id?: string
          katman?: string | null
          metadata?: Json
          source_title?: string
          source_url?: string
        }
        Relationships: []
      }
      knowledge_base_jobs: {
        Row: {
          attempt_counts: Json
          book_progress: Json
          book_queue: Json | null
          current_book: string | null
          errors: Json
          finished_at: string | null
          id: string
          mode: string
          processed_books: number
          processed_urls: Json
          started_at: string
          status: string
          total_books: number
          total_chunks: number
          updated_at: string
        }
        Insert: {
          attempt_counts?: Json
          book_progress?: Json
          book_queue?: Json | null
          current_book?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          mode?: string
          processed_books?: number
          processed_urls?: Json
          started_at?: string
          status?: string
          total_books?: number
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          attempt_counts?: Json
          book_progress?: Json
          book_queue?: Json | null
          current_book?: string | null
          errors?: Json
          finished_at?: string | null
          id?: string
          mode?: string
          processed_books?: number
          processed_urls?: Json
          started_at?: string
          status?: string
          total_books?: number
          total_chunks?: number
          updated_at?: string
        }
        Relationships: []
      }
      kural_kutuphanesi: {
        Row: {
          aciklama: string
          baslik: string
          created_at: string
          dogdugu_duzeltme_turu: string | null
          etkin: boolean
          geri_alindi: boolean
          geri_alma_zamani: string | null
          hedef_adim: string | null
          id: string
          kaynak_ozet: string | null
          kod: string
          onay_zamani: string | null
          onaylayan: string | null
          surum: number
        }
        Insert: {
          aciklama: string
          baslik: string
          created_at?: string
          dogdugu_duzeltme_turu?: string | null
          etkin?: boolean
          geri_alindi?: boolean
          geri_alma_zamani?: string | null
          hedef_adim?: string | null
          id?: string
          kaynak_ozet?: string | null
          kod: string
          onay_zamani?: string | null
          onaylayan?: string | null
          surum?: number
        }
        Update: {
          aciklama?: string
          baslik?: string
          created_at?: string
          dogdugu_duzeltme_turu?: string | null
          etkin?: boolean
          geri_alindi?: boolean
          geri_alma_zamani?: string | null
          hedef_adim?: string | null
          id?: string
          kaynak_ozet?: string | null
          kod?: string
          onay_zamani?: string | null
          onaylayan?: string | null
          surum?: number
        }
        Relationships: []
      }
      mediator_availability: {
        Row: {
          baslangic: string
          bitis: string
          created_at: string
          gun: string
          id: string
          user_id: string
        }
        Insert: {
          baslangic: string
          bitis: string
          created_at?: string
          gun: string
          id?: string
          user_id: string
        }
        Update: {
          baslangic?: string
          bitis?: string
          created_at?: string
          gun?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      mediator_blocked_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          mediator_id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          mediator_id: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          mediator_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      mediator_requests: {
        Row: {
          case_id: string
          created_at: string
          id: string
          mediator_id: string | null
          notes: string | null
          preferred_dates: string[] | null
          preferred_time: string | null
          room_name: string | null
          room_url: string | null
          scheduled_date: string | null
          session_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          mediator_id?: string | null
          notes?: string | null
          preferred_dates?: string[] | null
          preferred_time?: string | null
          room_name?: string | null
          room_url?: string | null
          scheduled_date?: string | null
          session_type?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          mediator_id?: string | null
          notes?: string | null
          preferred_dates?: string[] | null
          preferred_time?: string | null
          room_name?: string | null
          room_url?: string | null
          scheduled_date?: string | null
          session_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mediator_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "mediator_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mediators: {
        Row: {
          avg_resolution_days: number
          bio: string | null
          city: string | null
          created_at: string
          full_name: string
          hourly_rate: number
          id: string
          is_available: boolean
          languages: string[]
          photo_url: string | null
          rating: number
          specializations: string[]
          success_rate: number
          total_cases: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avg_resolution_days?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          languages?: string[]
          photo_url?: string | null
          rating?: number
          specializations?: string[]
          success_rate?: number
          total_cases?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avg_resolution_days?: number
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          hourly_rate?: number
          id?: string
          is_available?: boolean
          languages?: string[]
          photo_url?: string | null
          rating?: number
          specializations?: string[]
          success_rate?: number
          total_cases?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_invite_logs: {
        Row: {
          attempt: number
          case_id: string
          created_at: string
          error_message: string | null
          id: string
          party_id: string | null
          recipient_email: string
          recipient_name: string | null
          resend_message_id: string | null
          session_id: string
          status: string
        }
        Insert: {
          attempt?: number
          case_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          party_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_message_id?: string | null
          session_id: string
          status: string
        }
        Update: {
          attempt?: number
          case_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          party_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_message_id?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invite_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "meeting_invite_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_invite_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "case_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          case_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string | null
        }
        Insert: {
          case_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role?: string | null
        }
        Update: {
          case_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      mevzuat_alert_prefs: {
        Row: {
          aktif: boolean
          kanunlar: string[]
          taslaklari_da_bildir: boolean
          updated_at: string
          user_id: string
          uyusmazlik_turleri: string[]
        }
        Insert: {
          aktif?: boolean
          kanunlar?: string[]
          taslaklari_da_bildir?: boolean
          updated_at?: string
          user_id: string
          uyusmazlik_turleri?: string[]
        }
        Update: {
          aktif?: boolean
          kanunlar?: string[]
          taslaklari_da_bildir?: boolean
          updated_at?: string
          user_id?: string
          uyusmazlik_turleri?: string[]
        }
        Relationships: []
      }
      mevzuat_changes: {
        Row: {
          baslik: string
          content_hash: string | null
          created_at: string
          degisiklik_ozeti: string | null
          durum: string
          eski_metin: string | null
          id: string
          ilgili_kanun: string | null
          inceleme_durumu: string
          kaynak: string
          kaynak_url: string | null
          madde_no: string | null
          sayi: string | null
          yayim_tarihi: string | null
          yeni_metin: string | null
        }
        Insert: {
          baslik: string
          content_hash?: string | null
          created_at?: string
          degisiklik_ozeti?: string | null
          durum?: string
          eski_metin?: string | null
          id?: string
          ilgili_kanun?: string | null
          inceleme_durumu?: string
          kaynak: string
          kaynak_url?: string | null
          madde_no?: string | null
          sayi?: string | null
          yayim_tarihi?: string | null
          yeni_metin?: string | null
        }
        Update: {
          baslik?: string
          content_hash?: string | null
          created_at?: string
          degisiklik_ozeti?: string | null
          durum?: string
          eski_metin?: string | null
          id?: string
          ilgili_kanun?: string | null
          inceleme_durumu?: string
          kaynak?: string
          kaynak_url?: string | null
          madde_no?: string | null
          sayi?: string | null
          yayim_tarihi?: string | null
          yeni_metin?: string | null
        }
        Relationships: []
      }
      mevzuat_impact_map: {
        Row: {
          aciklama: string | null
          aktif: boolean
          created_at: string
          hedef_ref: string
          hedef_tip: string
          id: string
          ilgili_kanun: string
          madde_no: string | null
        }
        Insert: {
          aciklama?: string | null
          aktif?: boolean
          created_at?: string
          hedef_ref: string
          hedef_tip: string
          id?: string
          ilgili_kanun: string
          madde_no?: string | null
        }
        Update: {
          aciklama?: string | null
          aktif?: boolean
          created_at?: string
          hedef_ref?: string
          hedef_tip?: string
          id?: string
          ilgili_kanun?: string
          madde_no?: string | null
        }
        Relationships: []
      }
      negotiation_rounds: {
        Row: {
          accepted_by: string[]
          case_id: string
          created_at: string
          id: string
          proposal: Json
          rejected_by: string[]
          round_no: number
          status: string
          updated_at: string
        }
        Insert: {
          accepted_by?: string[]
          case_id: string
          created_at?: string
          id?: string
          proposal?: Json
          rejected_by?: string[]
          round_no: number
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_by?: string[]
          case_id?: string
          created_at?: string
          id?: string
          proposal?: Json
          rejected_by?: string[]
          round_no?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_rounds_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "negotiation_rounds_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_expert_updates: boolean
          email_mediator_assignment: boolean
          email_negotiation_updates: boolean
          email_session_invite: boolean
          email_session_reminder: boolean
          id: string
          inapp_expert_updates: boolean
          inapp_mediator_assignment: boolean
          inapp_negotiation_updates: boolean
          inapp_session_invite: boolean
          inapp_session_reminder: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_expert_updates?: boolean
          email_mediator_assignment?: boolean
          email_negotiation_updates?: boolean
          email_session_invite?: boolean
          email_session_reminder?: boolean
          id?: string
          inapp_expert_updates?: boolean
          inapp_mediator_assignment?: boolean
          inapp_negotiation_updates?: boolean
          inapp_session_invite?: boolean
          inapp_session_reminder?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_expert_updates?: boolean
          email_mediator_assignment?: boolean
          email_negotiation_updates?: boolean
          email_session_invite?: boolean
          email_session_reminder?: boolean
          id?: string
          inapp_expert_updates?: boolean
          inapp_mediator_assignment?: boolean
          inapp_negotiation_updates?: boolean
          inapp_session_invite?: boolean
          inapp_session_reminder?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      olay_cizelgesi: {
        Row: {
          case_id: string
          celiski_notu: string | null
          created_at: string
          id: string
          kaynak_adi: string | null
          kaynak_bolum: string | null
          kaynak_document_id: string | null
          kaynak_tipi: string
          olay: string
          sira: number
          tarih: string | null
          tarih_metni: string
        }
        Insert: {
          case_id: string
          celiski_notu?: string | null
          created_at?: string
          id?: string
          kaynak_adi?: string | null
          kaynak_bolum?: string | null
          kaynak_document_id?: string | null
          kaynak_tipi?: string
          olay: string
          sira?: number
          tarih?: string | null
          tarih_metni: string
        }
        Update: {
          case_id?: string
          celiski_notu?: string | null
          created_at?: string
          id?: string
          kaynak_adi?: string | null
          kaynak_bolum?: string | null
          kaynak_document_id?: string | null
          kaynak_tipi?: string
          olay?: string
          sira?: number
          tarih?: string | null
          tarih_metni?: string
        }
        Relationships: [
          {
            foreignKeyName: "olay_cizelgesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "olay_cizelgesi_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olay_cizelgesi_kaynak_document_id_fkey"
            columns: ["kaynak_document_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      oturum_hazirlik_foyleri: {
        Row: {
          bolumler: Json
          case_id: string
          created_at: string
          durum: string
          gonderim_zamani: string | null
          id: string
          onay_zamani: string | null
          onaylayan_user_id: string | null
          party_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          bolumler?: Json
          case_id: string
          created_at?: string
          durum?: string
          gonderim_zamani?: string | null
          id?: string
          onay_zamani?: string | null
          onaylayan_user_id?: string | null
          party_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          bolumler?: Json
          case_id?: string
          created_at?: string
          durum?: string
          gonderim_zamani?: string | null
          id?: string
          onay_zamani?: string | null
          onaylayan_user_id?: string | null
          party_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oturum_hazirlik_foyleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "oturum_hazirlik_foyleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oturum_hazirlik_foyleri_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oturum_hazirlik_foyleri_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "case_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      oturum_kayitlari: {
        Row: {
          case_id: string
          created_at: string
          dokum_metni: string | null
          dokum_silindi_at: string | null
          dokum_silme_notu: string | null
          id: string
          ses_dosya_yolu: string | null
          ses_silindi_at: string | null
          ses_silme_notu: string | null
          session_id: string | null
          talep_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          dokum_metni?: string | null
          dokum_silindi_at?: string | null
          dokum_silme_notu?: string | null
          id?: string
          ses_dosya_yolu?: string | null
          ses_silindi_at?: string | null
          ses_silme_notu?: string | null
          session_id?: string | null
          talep_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          dokum_metni?: string | null
          dokum_silindi_at?: string | null
          dokum_silme_notu?: string | null
          id?: string
          ses_dosya_yolu?: string | null
          ses_silindi_at?: string | null
          ses_silme_notu?: string | null
          session_id?: string | null
          talep_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oturum_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "oturum_kayitlari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oturum_kayitlari_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "case_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oturum_kayitlari_talep_id_fkey"
            columns: ["talep_id"]
            isOneToOne: false
            referencedRelation: "kayit_onay_talepleri"
            referencedColumns: ["id"]
          },
        ]
      }
      party_analyses: {
        Row: {
          analysis: Json
          case_id: string
          created_at: string
          discovery_questions: Json
          id: string
          issue_description_snapshot: string | null
          party_id: string
          prep_notes: Json
          risk_analizi: Json | null
          round_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json
          case_id: string
          created_at?: string
          discovery_questions?: Json
          id?: string
          issue_description_snapshot?: string | null
          party_id: string
          prep_notes?: Json
          risk_analizi?: Json | null
          round_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json
          case_id?: string
          created_at?: string
          discovery_questions?: Json
          id?: string
          issue_description_snapshot?: string | null
          party_id?: string
          prep_notes?: Json
          risk_analizi?: Json | null
          round_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "party_analyses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_analyses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_communication_analysis: {
        Row: {
          case_id: string
          created_at: string
          discovery_questions: Json
          findings: Json
          id: string
          party_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          discovery_questions?: Json
          findings?: Json
          id?: string
          party_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          discovery_questions?: Json
          findings?: Json
          id?: string
          party_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_communication_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "party_communication_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_communication_analysis_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_consistency_findings: {
        Row: {
          case_id: string
          created_at: string
          findings: Json
          id: string
          party_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          findings?: Json
          id?: string
          party_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          findings?: Json
          id?: string
          party_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_consistency_findings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "party_consistency_findings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_consistency_findings_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_invite_logs: {
        Row: {
          case_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          party_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          party_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_invite_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "party_invite_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_invite_logs_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_root_cause_analysis: {
        Row: {
          case_id: string
          created_at: string
          id: string
          kok_neden: Json
          party_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          kok_neden?: Json
          party_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          kok_neden?: Json
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_root_cause_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "party_root_cause_analysis_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_root_cause_analysis_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_pool: {
        Row: {
          approved: boolean | null
          created_at: string
          id: string
          metadata: Json | null
          niche_area: string | null
          raw_content: string
          rejection_reason: string | null
          relevance_score: number | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          niche_area?: string | null
          raw_content: string
          rejection_reason?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          niche_area?: string | null
          raw_content?: string
          rejection_reason?: string | null
          relevance_score?: number | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banka_adi: string | null
          created_at: string
          email: string | null
          full_name: string | null
          iban: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          vergi_dairesi: string | null
          vkn_tckn: string | null
        }
        Insert: {
          avatar_url?: string | null
          banka_adi?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          vergi_dairesi?: string | null
          vkn_tckn?: string | null
        }
        Update: {
          avatar_url?: string | null
          banka_adi?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          iban?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          vergi_dairesi?: string | null
          vkn_tckn?: string | null
        }
        Relationships: []
      }
      randevu_teklifleri: {
        Row: {
          case_id: string
          cevap_zamani: string | null
          created_at: string
          durum: string
          id: string
          party_id: string
          secenekler: Json
          secilen: string | null
          token: string
        }
        Insert: {
          case_id: string
          cevap_zamani?: string | null
          created_at?: string
          durum?: string
          id?: string
          party_id: string
          secenekler: Json
          secilen?: string | null
          token?: string
        }
        Update: {
          case_id?: string
          cevap_zamani?: string | null
          created_at?: string
          durum?: string
          id?: string
          party_id?: string
          secenekler?: Json
          secilen?: string | null
          token?: string
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          created_at: string
          id: string
          mediator_request_id: string
          proposed_date: string
          reason: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mediator_request_id: string
          proposed_date: string
          reason?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mediator_request_id?: string
          proposed_date?: string
          reason?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_mediator_request_id_fkey"
            columns: ["mediator_request_id"]
            isOneToOne: false
            referencedRelation: "mediator_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          comments: string | null
          created_at: string
          fairness_rating: number | null
          id: string
          mediator_rating: number | null
          mediator_request_id: string
          overall_rating: number
          user_id: string
          would_recommend: boolean | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          fairness_rating?: number | null
          id?: string
          mediator_rating?: number | null
          mediator_request_id: string
          overall_rating: number
          user_id: string
          would_recommend?: boolean | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          fairness_rating?: number | null
          id?: string
          mediator_rating?: number | null
          mediator_request_id?: string
          overall_rating?: number
          user_id?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_mediator_request_id_fkey"
            columns: ["mediator_request_id"]
            isOneToOne: false
            referencedRelation: "mediator_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          case_id: string
          created_at: string
          created_by: string
          duration_min: number | null
          id: string
          scheduled_for: string | null
          status: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by: string
          duration_min?: number | null
          id?: string
          scheduled_for?: string | null
          status?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string
          duration_min?: number | null
          id?: string
          scheduled_for?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      taraf_kalemleri: {
        Row: {
          ajan_notu: string | null
          case_id: string
          created_at: string
          dayanak_alinti: string | null
          dayanak_belge_id: string | null
          durum: string
          id: string
          kalem_adi: string
          kaynak: string
          para_birimi: string
          party_id: string
          tutar: number | null
          updated_at: string
        }
        Insert: {
          ajan_notu?: string | null
          case_id: string
          created_at?: string
          dayanak_alinti?: string | null
          dayanak_belge_id?: string | null
          durum?: string
          id?: string
          kalem_adi: string
          kaynak?: string
          para_birimi?: string
          party_id: string
          tutar?: number | null
          updated_at?: string
        }
        Update: {
          ajan_notu?: string | null
          case_id?: string
          created_at?: string
          dayanak_alinti?: string | null
          dayanak_belge_id?: string | null
          durum?: string
          id?: string
          kalem_adi?: string
          kaynak?: string
          para_birimi?: string
          party_id?: string
          tutar?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taraf_kalemleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "taraf_kalemleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taraf_kalemleri_dayanak_belge_id_fkey"
            columns: ["dayanak_belge_id"]
            isOneToOne: false
            referencedRelation: "case_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taraf_kalemleri_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      taraf_musaitlik: {
        Row: {
          baslangic: string
          bitis: string
          created_at: string
          gun: string
          id: string
          party_id: string
        }
        Insert: {
          baslangic: string
          bitis: string
          created_at?: string
          gun: string
          id?: string
          party_id: string
        }
        Update: {
          baslangic?: string
          bitis?: string
          created_at?: string
          gun?: string
          id?: string
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taraf_musaitlik_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      teklif_braketleri: {
        Row: {
          ajan_islendi_at: string | null
          alt_sinir: number | null
          case_id: string
          created_at: string
          id: string
          kosul_bant_alt: number | null
          kosul_bant_ust: number | null
          kosul_durumu: string
          kosul_notu: string | null
          kosullu_deger: number | null
          para_birimi: string
          party_id: string
          updated_at: string
          ust_sinir: number | null
        }
        Insert: {
          ajan_islendi_at?: string | null
          alt_sinir?: number | null
          case_id: string
          created_at?: string
          id?: string
          kosul_bant_alt?: number | null
          kosul_bant_ust?: number | null
          kosul_durumu?: string
          kosul_notu?: string | null
          kosullu_deger?: number | null
          para_birimi?: string
          party_id: string
          updated_at?: string
          ust_sinir?: number | null
        }
        Update: {
          ajan_islendi_at?: string | null
          alt_sinir?: number | null
          case_id?: string
          created_at?: string
          id?: string
          kosul_bant_alt?: number | null
          kosul_bant_ust?: number | null
          kosul_durumu?: string
          kosul_notu?: string | null
          kosullu_deger?: number | null
          para_birimi?: string
          party_id?: string
          updated_at?: string
          ust_sinir?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teklif_braketleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "teklif_braketleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teklif_braketleri_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usul_engelleri: {
        Row: {
          case_id: string
          created_at: string
          durum: string
          engeller: Json
          id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          durum?: string
          engeller?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          durum?: string
          engeller?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usul_engelleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "usul_engelleri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      usul_onerileri: {
        Row: {
          case_id: string
          created_at: string
          durum: string
          id: string
          oneriler: Json
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          durum?: string
          id?: string
          oneriler?: Json
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          durum?: string
          id?: string
          oneriler?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usul_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "usul_onerileri_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      yz_beyan_onaylari: {
        Row: {
          case_id: string
          id: string
          metin_surumu: string
          onay_zamani: string
          party_id: string
        }
        Insert: {
          case_id: string
          id?: string
          metin_surumu?: string
          onay_zamani?: string
          party_id: string
        }
        Update: {
          case_id?: string
          id?: string
          metin_surumu?: string
          onay_zamani?: string
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yz_beyan_onaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "case_outcome_analytics"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "yz_beyan_onaylari_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yz_beyan_onaylari_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "case_parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      case_outcome_analytics: {
        Row: {
          agreement_amount: number | null
          application_date: string | null
          case_id: string | null
          closed_at: string | null
          current_phase: number | null
          dispute_subtype: string | null
          dispute_type: string | null
          kapanis_belgesi_tipi: string | null
          kokpit_kullanildi: boolean | null
          kor_teklif_kullanildi: boolean | null
          oturum_sayisi: number | null
          outcome: string | null
          status: string | null
          sure_gun: number | null
          uzman_kullanildi: boolean | null
        }
        Insert: {
          agreement_amount?: number | null
          application_date?: string | null
          case_id?: string | null
          closed_at?: string | null
          current_phase?: number | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          kapanis_belgesi_tipi?: never
          kokpit_kullanildi?: never
          kor_teklif_kullanildi?: never
          oturum_sayisi?: never
          outcome?: string | null
          status?: string | null
          sure_gun?: never
          uzman_kullanildi?: never
        }
        Update: {
          agreement_amount?: number | null
          application_date?: string | null
          case_id?: string | null
          closed_at?: string | null
          current_phase?: number | null
          dispute_subtype?: string | null
          dispute_type?: string | null
          kapanis_belgesi_tipi?: never
          kokpit_kullanildi?: never
          kor_teklif_kullanildi?: never
          oturum_sayisi?: never
          outcome?: string | null
          status?: string | null
          sure_gun?: never
          uzman_kullanildi?: never
        }
        Relationships: []
      }
      mediators_public: {
        Row: {
          avg_resolution_days: number | null
          bio: string | null
          city: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_available: boolean | null
          languages: string[] | null
          photo_url: string | null
          rating: number | null
          specializations: string[] | null
          success_rate: number | null
          total_cases: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avg_resolution_days?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_available?: boolean | null
          languages?: string[] | null
          photo_url?: string | null
          rating?: number | null
          specializations?: string[] | null
          success_rate?: number | null
          total_cases?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avg_resolution_days?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_available?: boolean | null
          languages?: string[] | null
          photo_url?: string | null
          rating?: number | null
          specializations?: string[] | null
          success_rate?: number | null
          total_cases?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      braket_bant_cevapla: {
        Args: { p_kabul: boolean; p_soru_id: string }
        Returns: string
      }
      braket_bant_sorularim: {
        Args: { p_case_id: string }
        Returns: {
          bant_alt: number
          bant_ust: number
          created_at: string
          durum: string
          id: string
          para_birimi: string
        }[]
      }
      can_access_case: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_realtime_topic: { Args: { _topic: string }; Returns: boolean }
      can_view_agent_state: {
        Args: {
          _agent_type: string
          _case_id: string
          _party_id: string
          _user_id: string
        }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_application_no: { Args: never; Returns: string }
      get_case_mediator_payment_info: {
        Args: { p_case_id: string }
        Returns: {
          banka_adi: string
          full_name: string
          iban: string
        }[]
      }
      get_case_payment_reference: {
        Args: { p_case_id: string }
        Returns: {
          arb_no: string
          buro_no: string
          mediation_type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_case_expert: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_mediator: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_owner_not_party: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_owner_safe: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_case_party: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      is_own_case_party: {
        Args: { _party_id: string; _user_id: string }
        Returns: boolean
      }
      list_experts_for_mediator: {
        Args: { filter_niche?: string }
        Returns: {
          active: boolean
          bio: string
          city: string
          full_name: string
          hourly_rate: number
          id: string
          niche_area: string
          rating: number
          specialization: string
          title: string
          years_experience: number
        }[]
      }
      match_cases: {
        Args: {
          filter_niche_area: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          anonymized_text: string
          id: string
          niche_area: string
          similarity: number
        }[]
      }
      match_knowledge_base: {
        Args: {
          filter_category?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          chunk_text: string
          metadata: Json
          similarity: number
          source_title: string
          source_url: string
        }[]
      }
      notify_admins_new_tariff: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "mediator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "mediator", "admin"],
    },
  },
} as const
