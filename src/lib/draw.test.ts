import { describe, expect, it } from "vitest";
import { draw, DrawError, type Participant, type Restriction } from "./draw";

const people = (n: number): Participant[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, email: `p${i}@example.com` }));

describe("draw", () => {
  it("niko ne izvlači sebe i svako prima tačno jednog", () => {
    for (let run = 0; run < 200; run++) {
      const ps = people(7);
      const result = draw(ps);
      expect(result).toHaveLength(7);
      for (const { giver, receiver } of result) expect(giver).not.toBe(receiver);
      const receivers = new Set(result.map((r) => r.receiver.email));
      expect(receivers.size).toBe(7);
    }
  });

  it("poštuje zabranjene parove u oba smera", () => {
    const ps = people(6);
    const restrictions: Restriction[] = [
      [0, 1],
      [2, 3],
      [4, 5],
    ];
    for (let run = 0; run < 300; run++) {
      const result = draw(ps, restrictions);
      const idx = (p: Participant) => ps.indexOf(p);
      for (const { giver, receiver } of result) {
        for (const [a, b] of restrictions) {
          const pair = [idx(giver), idx(receiver)].sort().join(",");
          expect(pair).not.toBe([a, b].sort().join(","));
        }
      }
    }
  });

  it("radi za dvoje ljudi", () => {
    const [a, b] = people(2);
    const result = draw([a, b]);
    expect(result.find((r) => r.giver === a)?.receiver).toBe(b);
    expect(result.find((r) => r.giver === b)?.receiver).toBe(a);
  });

  it("baca grešku kada je raspored nemoguć", () => {
    // Troje ljudi, a 0 ne sme ni sa 1 ni sa 2.
    expect(() => draw(people(3), [[0, 1], [0, 2]])).toThrow(DrawError);
    // Dvoje ljudi koji ne smeju jedno drugo.
    expect(() => draw(people(2), [[0, 1]])).toThrow(DrawError);
  });

  it("baca grešku za manje od dvoje učesnika", () => {
    expect(() => draw(people(1))).toThrow(DrawError);
  });

  it("baca grešku za ograničenje sa nepostojećim učesnikom", () => {
    expect(() => draw(people(3), [[0, 9]])).toThrow(DrawError);
  });

  it("raspodela je raznovrsna (nije uvek isti raspored)", () => {
    const ps = people(5);
    const seen = new Set<string>();
    for (let run = 0; run < 100; run++) {
      seen.add(draw(ps).map((r) => ps.indexOf(r.receiver)).join(","));
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});
