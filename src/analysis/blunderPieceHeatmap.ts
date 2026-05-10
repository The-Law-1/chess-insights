import { Chess } from 'chess.js';
import type { AnalysedGame } from './types';

export interface SquareData {
    count: number;
    totalSwing: number;
}

function getFromSquare(fenBefore: string, san: string): string | null {
    try {
        const chess = new Chess(fenBefore);
        const moves = chess.moves({ verbose: true });
        const match = moves.find(m => m.san === san);
        return match?.from ?? null;
    } catch {
        return null;
    }
}

export function blunderPieceHeatmap(games: AnalysedGame[]): Record<string, SquareData> {
    const squares: Record<string, SquareData> = {};

    for (let rank = 1; rank <= 8; rank++) {
        for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            squares[file + String(rank)] = { count: 0, totalSwing: 0 };
        }
    }

    for (const game of games) {
        for (const blunder of game.blunders) {
            const fromSquare = getFromSquare(blunder.fenBefore, blunder.san);
            if (!fromSquare) continue;
            squares[fromSquare].count += 1;
            squares[fromSquare].totalSwing += Math.abs(blunder.swing);
        }
    }

    return squares;
}
