export type SplitEndgameMaterialResult = { white: string; black: string; rest: string[] };

export function splitEndgameMaterial(endgameType: string): SplitEndgameMaterialResult | null {
	if (!endgameType) {
		return null;
	}

	const [base, ...rest] = endgameType.split("_");
	if (!base) {
		return null;
	}

	const splitIndex = base.indexOf("K", 1);
	if (splitIndex === -1) {
		return null;
	}

	const white = base.slice(0, splitIndex);
	const black = base.slice(splitIndex);

	return { white, black, rest };
}

export default function endgameTypeToReadable(endgameType: string): string {
	const { black, white, rest } = splitEndgameMaterial(endgameType) || { black: "", white: "", rest: [] };
	if (!black || !white) {
		return endgameType;
	}

	const formatSide = (material: string) => {
		const pieces = material.slice(1).split("").filter(Boolean);
		return pieces.length > 0 ? `K ${pieces.join(" ")}` : "K";
	};

	const restString = rest.length > 0 ? ` (${rest.join(", ")})` : "";
	return `${formatSide(white)} vs ${formatSide(black)}${restString}`;
}
