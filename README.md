# 🎅 Tajni Deda Mraz (Secret Santa)

Web aplikacija u kojoj uneseš imena i mejlove učesnika, dodaš ograničenja (npr. partneri ne mogu da izvuku jedno drugo), a aplikacija nasumično rasporedi parove i svakome pošalje mejl sa imenom osobe kojoj kupuje poklon. Ništa se ne čuva, pa ni ti ne vidiš ko je koga izvukao.

**Tehnologije:** Next.js (App Router) + TypeScript, slanje mejlova preko SMTP-a (`nodemailer`), testovi u Vitest-u.

## Kako radi

- Izvlačenje je backtracking algoritam sa kriptografski sigurnim random generatorom (`src/lib/draw.ts`).
- Niko ne izvlači sebe, zabranjeni parovi se ne izvlače ni u jednom smeru.
- Ako raspored nije moguć (previše ograničenja), dobiješ poruku umesto slanja.
- Mejlovi se šalju sa servera (`src/app/api/draw/route.ts`), pa lozinka od mejla nikad ne stiže u browser.
- Odgovor servera ne sadrži ko je koga izvukao, samo koliko je mejlova poslato.

## Pokretanje lokalno

```bash
npm install
cp .env.example .env.local   # pa popuni vrednosti
npm run dev
```

Otvori http://localhost:3000.

Testovi i provera tipova:

```bash
npm test
npm run typecheck
```

## Podešavanje mejla (SMTP)

Aplikacija se prijavljuje na SMTP server tvog mejl naloga i šalje u tvoje ime.

### Gmail (podrazumevano)

Gmail ne dozvoljava prijavu običnom lozinkom, potreban je **App password**:

1. Uključi dvostepenu verifikaciju na Google nalogu (myaccount.google.com → Security → 2-Step Verification).
2. Otvori myaccount.google.com/apppasswords, napravi lozinku za aplikaciju (ime proizvoljno) i kopiraj 16 slova.
3. U `.env.local` upiši `SMTP_USER` (tvoja Gmail adresa) i `SMTP_PASS` (tih 16 slova, razmaci nisu bitni). `SMTP_HOST` i `SMTP_PORT` ostaju kako jesu.

Gmail dozvoljava oko 500 poslatih mejlova dnevno, što je za Secret Santa više nego dovoljno.

### Drugi provajder

Promeni `SMTP_HOST` i `SMTP_PORT` prema podacima tvog provajdera (u njihovoj dokumentaciji traži "SMTP settings"). Port 465 koristi SSL, a 587 STARTTLS, i biblioteka to sama prepoznaje po portu. Neki provajderi traže i posebnu lozinku za aplikacije.

## Env promenljive

| Promenljiva   | Opis                                                                 |
| ------------- | -------------------------------------------------------------------- |
| `SMTP_HOST`   | SMTP server (podrazumevano `smtp.gmail.com`)                         |
| `SMTP_PORT`   | Port (podrazumevano `465`)                                           |
| `SMTP_USER`   | Tvoja mejl adresa za prijavu                                         |
| `SMTP_PASS`   | Lozinka (za Gmail: App password)                                     |
| `SMTP_FROM`   | Opciono, adresa u "From" ako je drugačija od `SMTP_USER`             |
| `SENDER_NAME` | Ime pošiljaoca u mejlu (opciono)                                     |
| `APP_PASSWORD`| Lozinka koju unosiš u formu. **Obavezno podesi kad je app javna.**  |

Bez `APP_PASSWORD` bi svako ko nađe tvoj link mogao da šalje mejlove sa tvog naloga.

## GitHub i Vercel

```bash
git init
git add .
git commit -m "Secret Santa"
git branch -M main
git remote add origin https://github.com/<tvoje-ime>/secret-santa.git
git push -u origin main
```

Zatim:

1. Na vercel.com klikni **Add New → Project** i izaberi repozitorijum.
2. U **Environment Variables** dodaj `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SENDER_NAME` i `APP_PASSWORD`.
3. Klikni **Deploy**. Svaki sledeći `git push` automatski deployuje novu verziju.

`.env` i `.env.local` su u `.gitignore`, pa lozinke ne idu na GitHub. Nikad ih ne stavljaj u kod ni u `.env.example`.

Lozinke stoje samo u podešavanjima na Vercelu, a ne u kodu, pa repozitorijum može da bude i javan. Zato `APP_PASSWORD` treba da bude jak, jer on štiti slanje sa tvog naloga.

## Struktura

```
src/
  app/
    page.tsx            forma (učesnici, ograničenja, detalji)
    api/draw/route.ts   validacija, izvlačenje, slanje mejlova
  lib/
    draw.ts             algoritam izvlačenja
    draw.test.ts        testovi algoritma
    email.ts            SMTP slanje (nodemailer) i šablon mejla
```

## Ograničenja

- Najviše 50 učesnika po izvlačenju.
- Ograničenje broja mejlova dolazi od tvog provajdera (Gmail oko 500 dnevno).
- Ako slanje uspe samo delimično, aplikacija javi kome mejl nije stigao. Pošto se ništa ne čuva, tada se izvlačenje pokreće ponovo za sve, pa ljudi koji su već dobili mejl dobiju novi, i važi samo poslednji.
