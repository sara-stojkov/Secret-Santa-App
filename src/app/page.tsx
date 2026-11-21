"use client";

import { useState, type FormEvent } from "react";

type Person = { name: string; email: string };

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "ok"; sent: number }
  | { kind: "error"; message: string };

const emptyPerson = (): Person => ({ name: "", email: "" });

export default function Home() {
  const [people, setPeople] = useState<Person[]>([emptyPerson(), emptyPerson(), emptyPerson()]);
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [pairA, setPairA] = useState("");
  const [pairB, setPairB] = useState("");
  const [budget, setBudget] = useState("");
  const [exchangeDate, setExchangeDate] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Ograničenja se odnose na indekse u listi, pa ih držimo samo za popunjene redove.
  const filled = people
    .map((p, index) => ({ ...p, index }))
    .filter((p) => p.name.trim() && p.email.trim());

  const labelOf = (index: number) => people[index]?.name.trim() || `Osoba ${index + 1}`;

  function updatePerson(index: number, field: keyof Person, value: string) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function removePerson(index: number) {
    setPeople((prev) => prev.filter((_, i) => i !== index));
    // Ukloni ograničenja koja uključuju obrisanu osobu i pomeri indekse iza nje.
    setPairs((prev) =>
      prev
        .filter(([a, b]) => a !== index && b !== index)
        .map(([a, b]) => [a > index ? a - 1 : a, b > index ? b - 1 : b] as [number, number]),
    );
    setPairA("");
    setPairB("");
  }

  function addPair() {
    if (pairA === "" || pairB === "" || pairA === pairB) return;
    const a = Number(pairA);
    const b = Number(pairB);
    const exists = pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (!exists) setPairs((prev) => [...prev, [a, b]]);
    setPairA("");
    setPairB("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "sending" });

    // Šaljemo samo popunjene redove, a ograničenja prevodimo na nove indekse.
    const indexMap = new Map(filled.map((p, newIndex) => [p.index, newIndex]));
    const restrictions = pairs
      .filter(([a, b]) => indexMap.has(a) && indexMap.has(b))
      .map(([a, b]) => [indexMap.get(a)!, indexMap.get(b)!]);

    try {
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          participants: filled.map(({ name, email }) => ({ name, email })),
          restrictions,
          budget,
          exchangeDate,
          message,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", message: data.error ?? "Nešto nije u redu." });
        return;
      }
      setStatus({ kind: "ok", sent: data.sent });
    } catch {
      setStatus({ kind: "error", message: "Nema veze sa serverom. Probaj ponovo." });
    }
  }

  const sending = status.kind === "sending";

  return (
    <main>
      <h1>🎅 Tajni Deda Mraz</h1>
      <p className="lead">
        Unesi učesnike, izvuci parove i svako dobija mejl sa imenom osobe kojoj kupuje poklon.
        Ni ti ne vidiš ko je koga izvukao.
      </p>

      <form onSubmit={onSubmit}>
        <section>
          <h2>Učesnici</h2>
          {people.map((person, i) => (
            <div className="row" key={i}>
              <input
                placeholder="Ime"
                aria-label={`Ime, osoba ${i + 1}`}
                value={person.name}
                onChange={(e) => updatePerson(i, "name", e.target.value)}
              />
              <input
                type="email"
                placeholder="Mejl"
                aria-label={`Mejl, osoba ${i + 1}`}
                value={person.email}
                onChange={(e) => updatePerson(i, "email", e.target.value)}
              />
              <button
                type="button"
                className="ghost"
                onClick={() => removePerson(i)}
                aria-label={`Ukloni osobu ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setPeople([...people, emptyPerson()])}>
            + Dodaj osobu
          </button>
        </section>

        <section>
          <h2>Ograničenja</h2>
          <p className="hint">Parovi koji ne smeju da se izvuku međusobno (npr. partneri).</p>
          <div className="row">
            <select value={pairA} onChange={(e) => setPairA(e.target.value)} aria-label="Prva osoba">
              <option value="">Prva osoba…</option>
              {filled.map((p) => (
                <option key={p.index} value={p.index}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={pairB} onChange={(e) => setPairB(e.target.value)} aria-label="Druga osoba">
              <option value="">Druga osoba…</option>
              {filled
                .filter((p) => String(p.index) !== pairA)
                .map((p) => (
                  <option key={p.index} value={p.index}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button type="button" className="secondary" onClick={addPair} disabled={pairA === "" || pairB === ""}>
              Dodaj
            </button>
          </div>
          {pairs.length > 0 && (
            <ul className="pairs">
              {pairs.map(([a, b], i) => (
                <li key={`${a}-${b}`}>
                  <span>
                    {labelOf(a)} ↔ {labelOf(b)}
                  </span>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setPairs(pairs.filter((_, j) => j !== i))}
                    aria-label={`Ukloni ograničenje ${labelOf(a)} i ${labelOf(b)}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Detalji (opciono)</h2>
          <div className="row">
            <input
              placeholder="Budžet, npr. do 2000 din"
              aria-label="Budžet"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <input
              placeholder="Datum razmene, npr. 25. decembar"
              aria-label="Datum razmene"
              value={exchangeDate}
              onChange={(e) => setExchangeDate(e.target.value)}
            />
          </div>
          <textarea
            placeholder="Poruka koja ide u svaki mejl"
            aria-label="Poruka"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </section>

        <section>
          <h2>Slanje</h2>
          <input
            type="password"
            placeholder="Lozinka (ako je podešena na serveru)"
            aria-label="Lozinka"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="primary" disabled={sending || filled.length < 2}>
            {sending ? "Šaljem…" : "Izvuci i pošalji mejlove"}
          </button>
          {filled.length < 2 && <p className="hint">Potrebno je bar dvoje učesnika sa imenom i mejlom.</p>}
        </section>

        {status.kind === "ok" && (
          <p className="alert ok" role="status">
            Gotovo! Poslato mejlova: {status.sent}. 🎁
          </p>
        )}
        {status.kind === "error" && (
          <p className="alert error" role="alert">
            {status.message}
          </p>
        )}
      </form>
    </main>
  );
}
