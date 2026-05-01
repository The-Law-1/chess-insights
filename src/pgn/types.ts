export type EndgameType = "KQK" | "KRK" | "KBK" | "KNK" | "KPK" | "KPPK" | "KPvK" | "KPPvK";
const endgameTypeToValue: Record<EndgameType, string> = {
  "KQK": "King and Queen vs King",
  "KRK": "King and Rook vs King",
  "KBK": "King and Bishop vs King",
  "KNK": "King and Knight vs King",
  "KPK": "King and Pawn vs King",
  "KPPK": "King and Two Pawns vs King",
  "KPvK": "King and Pawn vs King",
  "KPPvK": "King and Two Pawns vs King"
};