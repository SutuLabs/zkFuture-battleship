export type GameStatus =
  | 'WAITJOIN'
  | 'OTHER-GAMING'
  | 'MY-GAMING'
  | 'WIN'
  | 'WAITOTHER';
export interface GameState {
  id: bigint;
  participants: [string, string];
  boards: [bigint, bigint];
  turn: bigint;
  hits: [bigint, bigint];
  winner: string;
  title: string;
  subtitle?: string;
  status: GameStatus;
}

export type RawGameStateFromEth = [
  [string, string],
  [bigint, bigint],
  bigint,
  [bigint, bigint],
  string
] & {
  _participants: [string, string];
  _boards: [bigint, bigint];
  _turn: bigint;
  _hits: [bigint, bigint];
  _winner: string;
};

export function convertToGameState(
  gameState: RawGameStateFromEth,
  accountAddress: string,
  id: bigint
): GameState {
  const [[p1pk, p2pk], [p1board, p2board], turn, [hit1, hit2], winner] =
    gameState;
  const status =
    p1pk == accountAddress &&
    p2pk == '0x0000000000000000000000000000000000000000'
      ? 'WAITOTHER'
      : p2pk == '0x0000000000000000000000000000000000000000'
      ? 'WAITJOIN'
      : winner != '0x0000000000000000000000000000000000000000'
      ? 'WIN'
      : p1pk == accountAddress || p2pk == accountAddress
      ? 'MY-GAMING'
      : 'OTHER-GAMING';
  return {
    id,
    participants: [p1pk, p2pk],
    boards: [p1board, p2board],
    turn,
    hits: [hit1, hit2],
    winner,
    title:
      status == 'WIN'
        ? 'Game Finished'
        : status == 'WAITJOIN'
        ? 'Join Game'
        : status == 'OTHER-GAMING'
        ? "Other's Game"
        : status == 'WAITOTHER'
        ? 'Wait Other'
        : status == 'MY-GAMING'
        ? 'Resume'
        : 'UNKNOWN',
    subtitle: status == 'WAITJOIN' ? p1pk : `${hit1} vs ${hit2}`,
    status,
  };
}

export function convertShots(rawShot: bigint[], rawHit: boolean[]): Turn {
  const turn: Turn = {};
  for (let i = 0; i < rawShot.length; i++) {
    const e = Number(rawShot[i]);
    if (e > 0) {
      const h = Number(rawHit[i]);
      const x = i % 10;
      const y = Math.floor(i / 10);
      turn[`${x + 1}|${y + 1}`] = h ? 'hit' : 'miss';
    }
  }
  return turn;
}
