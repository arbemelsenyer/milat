// Privacy leak query definitions — pure data, used by both the UI and the test suite.
// Each query represents a "can the current user see another party's data?" probe.
// Pass condition: no rows returned that are NOT owned by the current user.

export type LeakQuery = {
  id: string;
  name: string;
  description: string;
  table: string;
  ownerColumn: string;
  selectColumns: string;
};

export const LEAK_QUERIES: LeakQuery[] = [
  {
    id: "party_analyses",
    name: "party_analyses gizliliği",
    description: "Mevcut kullanıcı, kendisine ait olmayan party_analyses satırlarını okuyamaz.",
    table: "party_analyses",
    ownerColumn: "user_id",
    selectColumns: "id, user_id",
  },
  {
    id: "case_discovery_questions",
    name: "case_discovery_questions gizliliği",
    description: "Diğer tarafa ait keşif sorularına erişim engellenir.",
    table: "case_discovery_questions",
    ownerColumn: "user_id",
    selectColumns: "id, user_id",
  },
  {
    id: "case_documents",
    name: "case_documents yalnızca yükleyen/yetkili",
    description: "Karşı tarafa ait belge metaverisi başkası tarafından okunamaz.",
    table: "case_documents",
    ownerColumn: "uploaded_by",
    selectColumns: "id, uploaded_by",
  },
];

// Evaluates a result set against a leak query for the current user.
// Returns true if NO leak detected.
export function isLeakFree(
  rows: Array<Record<string, unknown>>,
  ownerColumn: string,
  currentUserId: string
): boolean {
  if (!rows || rows.length === 0) return true;
  return rows.every(
    (r) => !r[ownerColumn] || r[ownerColumn] === currentUserId
  );
}

export function countLeaks(
  rows: Array<Record<string, unknown>>,
  ownerColumn: string,
  currentUserId: string
): number {
  if (!rows) return 0;
  return rows.filter(
    (r) => r[ownerColumn] && r[ownerColumn] !== currentUserId
  ).length;
}
