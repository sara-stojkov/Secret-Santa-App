import { randomInt } from "node:crypto";

export type Participant = {
  name: string;
  email: string;
};

/** Par indeksa učesnika koji ne smeju da se izvuku međusobno (u oba smera). */
export type Restriction = [number, number];

export type Assignment = {
  giver: Participant;
  receiver: Participant;
};

export class DrawError extends Error {}

/** Fisher-Yates mešanje sa kriptografski sigurnim random generatorom. */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Nasumično izvlači ko kome kupuje poklon.
 *
 * Pravila:
 *  - niko ne izvlači sebe,
 *  - nijedan zabranjeni par se ne izvlači (ni u jednom smeru),
 *  - svako daje tačno jedan poklon i prima tačno jedan.
 *
 * Koristi backtracking sa nasumičnim redosledom kandidata, pa je svaki
 * važeći raspored moguć. Baca DrawError ako raspored ne postoji.
 */
export function draw(
  participants: Participant[],
  restrictions: Restriction[] = [],
): Assignment[] {
  const n = participants.length;
  if (n < 2) {
    throw new DrawError("Potrebno je bar dvoje učesnika.");
  }

  const forbidden = Array.from({ length: n }, () => new Set<number>());
  for (const [a, b] of restrictions) {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n) {
      throw new DrawError("Ograničenje se odnosi na nepostojećeg učesnika.");
    }
    if (a === b) continue;
    forbidden[a].add(b);
    forbidden[b].add(a);
  }

  const receiverOf: number[] = new Array(n).fill(-1);
  const taken = new Array<boolean>(n).fill(false);

  // Prvo oni sa najviše ograničenja, da backtracking brže odseče slepe grane.
  const order = shuffle([...Array(n).keys()]).sort(
    (x, y) => forbidden[y].size - forbidden[x].size,
  );

  const solve = (pos: number): boolean => {
    if (pos === n) return true;
    const giver = order[pos];
    for (const candidate of shuffle([...Array(n).keys()])) {
      if (candidate === giver || taken[candidate] || forbidden[giver].has(candidate)) {
        continue;
      }
      receiverOf[giver] = candidate;
      taken[candidate] = true;
      if (solve(pos + 1)) return true;
      taken[candidate] = false;
      receiverOf[giver] = -1;
    }
    return false;
  };

  if (!solve(0)) {
    throw new DrawError(
      "Nije moguće napraviti raspored sa ovim ograničenjima. Probaj da ukloniš neko ograničenje.",
    );
  }

  return participants.map((giver, i) => ({
    giver,
    receiver: participants[receiverOf[i]],
  }));
}
