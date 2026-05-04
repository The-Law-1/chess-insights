export type EndgameType =
  | `K${string}K${string}`
  | `K${string}K${string}_${string}`
  | `K${string}K${string}_${string}_${string}`


export const EndgameTypeToHumanReadable: Record<EndgameType, string> = {
  "KK": "King vs King",
  "KPK": "King and Pawn vs King",
  "KPPK": "King and Two Pawns vs King",
  "KPPP_K": "King and Three Pawns vs King",
  "KPPP_KP": "King and Three Pawns vs King and Pawn",
  "KPPP_KPP": "King and Three Pawns vs King and Two Pawns",
  "KPPP_KPPP": "King and Three Pawns vs King and Three Pawns",
  "KPPPK_K": "King and Four Pawns vs King",
  "KPPPK_KP": "King and Four Pawns vs King and Pawn",
  "KPPPK_KPP": "King and Four Pawns vs King and Two Pawns",
  "KPPPK_KPPP": "King and Four Pawns vs King and Three Pawns",
  "KPPPK_KPPPK": "King and Four Pawns vs King and Four Pawns",
}