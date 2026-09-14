# AUDI IT Team Pulse – Anonymes Stimmungsbild

Ein webbasiertes, 100% datenschutzkonformes und frontend-only Werkzeug für AUDI IT-Abteilungen. Entwickler und Mitarbeiter bewerten ihre Arbeitswoche anonym anhand von 6 zufällig ausgewählten IT-Fragen (aus einem Pool von 20 Fragen). Das Ergebnis wird durch einen wöchentlichen, geheimen Algorithmus in eine codierte Zahl (z. B. `237-R824-543542`) transformiert.

In der wöchentlichen Teamrunde / Retrospektive werden die Codes aggregiert, decodiert und in einem Audi-Virtual-Cockpit-inspirierten Dashboard visualisiert – ohne dass Rückschlüsse auf einzelne Personen möglich sind.

---

## 🏎️ Audi Brand & UI Design

- **Primärfarben**: Audi Weiß (`#FFFFFF`), Audi Schwarz (`#000000`) und Audi Progressive Red (`#BB0A30`).
- **Typografie**: Plus Jakarta Sans / Geometric Grotesque mit präziser mathematischer Hierarchie.
- **Design-Philosophie**: Klar, unaufgeregt, keine unnötige Überfrachtung, fokussiert auf pure Funktionalität.
- **Responsive**: Optimiert für mobile Endgeräte (z.B. iPhone/Android im Standup) sowie Desktop (Screen-Sharing im Konferenzraum).

---

## 🔒 100% Datenschutz & Zero-Backend Prinzip

- **Kein Server & keine Datenbank**: Die Anwendung speichert keinerlei personenbezogene Daten, IP-Adressen oder Cookies.
- **Client-Side Only**: Sämtliche Berechnungen und Visualisierungen erfolgen ausschließlich im Browser des Nutzers.
- **Hosting-Freiheit**: Kompatibel mit Cloudflare Pages, GitHub Pages, Vercel oder internen statischen Nginx-Servern.
- **Pseudonymität**: Jeder Mitarbeiter erhält zu Beginn eine zufällige 4-stellige Audi-Kennung (z. B. `#R824`, `#A619`, `#Q788`). Nur der Mitarbeiter selbst weiß, welches Kärtchen auf der Teampinnwand zu ihm gehört.

---

## 🧮 Der geheime Wochen-Algorithmus

Der Algorithmus stellt sicher, dass man aus der erzeugten Zahl nicht direkt auf den ersten Blick ablesen kann, ob die Stimmung gut oder schlecht war, da jede Kalenderwoche einen neuen mathematischen Multiplikator und Offset besitzt. Gleichzeitig ist die Zahl streng monoton: Ein höherer Gesamtscore führt immer zu einer höheren Endsumme.

### 1. Parameter der Woche
Für eine gegebene Kalenderwoche (KW) und das Datum des Montags dieser Woche:
1. **Punkte-Summe ($S$)**: Summe der 6 beantworteten Fragen (jede Frage $1$ bis $5$ Punkte) $\rightarrow S \in [6, 30]$.
2. **KW-Faktor ($F_{\text{KW}}$)**: $6 + (\text{KW} \pmod 7)$ (Wert zwischen $6$ und $12$).
3. **Montags-Offset ($M_{\text{offset}}$)**: $(\text{TagDesMonats} \times 3) \pmod{40}$.
4. **Paritäts-Bonus ($P$)**:
   - Wenn $\text{KW}$ gerade ist: $+36$
   - Wenn $\text{KW}$ ungerade ist: $-14$
5. **Basis-Offset**: $+110$

### 2. Codierungs-Formel (Verschlüsselung)
$$\text{Wochen-Zahl } (Z) = (S \times F_{\text{KW}}) + M_{\text{offset}} + P + 110$$

### 3. Vollständiger Token
Um dem Team-Dashboard sowohl die Secret ID als auch die Kategorien mitzuteilen, wird der Token wie folgt formatiert:
$$\text{Token} = \text{Zahl} - \text{SecretID} - \text{Antwortziffern}$$
*Beispiel*: `237-R824-543542`
- `237`: Die codierte Wochen-Zahl.
- `R824`: Die 4-stellige Secret ID des Mitarbeiters.
- `543542`: Die 6 vergebenen Punkte (jeweils 1 bis 5).

### 4. Decodierungs-Formel (Teamrunde)
Im Team-Dashboard wird die Punktesumme $S$ und der Durchschnittswert ($A = S / 6$) wie folgt berechnet:
$$S = \frac{Z - M_{\text{offset}} - P - 110}{F_{\text{KW}}}$$
Wird der vollständige Token eingegeben, werden die 6 Antworten zusätzlich auf die 4 Säulen (Fokus, Workload, Team, Tech) aufgeteilt.

---

## 📋 Der Fragenkatalog (20 Fragen mit 5 Optionen & Gewichtung)

Jede Frage besitzt genau 5 Antwortmöglichkeiten, gewichtet von **1 (kritisch / hohe Belastung)** bis **5 (optimaler Flow / beste Stimmung)**.

| ID | Kategorie | Thema | Frage | Optionen (Punkte 5 $\rightarrow$ 1) |
|---|---|---|---|---|
| 1 | Workload | Koffein-Pegel | Koffein-Durchsatz: Wie viele Tassen Kaffee / Mate hast du diese Woche gebraucht? | 0-1 Tassen (5) / 2-3 Tassen (4) / 4-5 Tassen (3) / 6-8 Tassen (2) / 9+ Tassen Dauer-Infusion (1) |
| 2 | Tech | Git & Versionierung | Git Merge Conflicts: Wie oft hat dir Git diese Woche die Nerven geraubt? | 0x Fast-Forward (5) / 1x Kleiner Konflikt (4) / 2-3x PR-Dschungel (3) / Täglich Rebase-Albtraum (2) / git merge --abort & Tränen (1) |
| 3 | Fokus | Deep Work | Meeting vs. Code: Wie viel echte Deep-Work-Zeit hattest du diese Woche? | >75% Fokuszeit (5) / 50-75% Fokuszeit (4) / 25-50% (3) / <25% Kalender-Pingpong (2) / Lebe in MS Teams (1) |
| 4 | Tech | CI/CD Pipelines | CI/CD Pipeline Karma: Wie grün war deine Deployment- & Test-Pipeline? | Strahlend grün (5) / 1 flaky Test (4) / 2-3 Retries nötig (3) / Dauerrot wegen Infra (2) / Pipeline brennt lichterloh (1) |
| 5 | Workload | Sprint-Dynamik | Jira Sprint Flow: Wie lief das Vorankommen im aktuellen Board? | Tickets fliegen nach Done (5) / Solider Fortschritt (4) / Einiges im In Review gestaut (3) / Scope Creep an allen Ecken (2) / Schwarzes Loch (1) |
| 6 | Workload | Release-Ruhe | Freitags-Deployment: Wie entspannt gehst du ins Wochenende? | Ruhepuls 55 (5) / Monitoring ruhig (4) / Auge im Alert-Kanal (3) / Zittern beim Blick aufs Handy (2) / Freitag 16:45 Hotfix auf Prod (1) |
| 7 | Fokus | Problemlösung | Rubber Duck Debugging: Wie schnell ließen sich knifflige Bugs lösen? | Sofort erkannt & elegant gefixt (5) / Kurzes Grübeln + Docs (4) / Console.log & StackOverflow (3) / Stundenlanges Starren (2) / Bug hat eigenes Bewusstsein (1) |
| 8 | Team | Code Reviews | Code Review Kultur: Wie fühlte sich das Feedback auf deine PRs an? | LGTM! & wertschätzend (5) / Konstruktiv & zügig (4) / Normale Syntax-Debatten (3) / PR hängt 4 Tage fest (2) / 87 Kommentare wegen Einrückungen (1) |
| 9 | Tech | Innovation & Tech | Audi Vorsprung-Faktor: Wie zukunftssicher fühlte sich dein Tech-Stack an? | Innovationsgeist & moderne AI/Cloud-Tools (5) / Moderne Architektur (4) / Guter Industriestandard (3) / Viel Legacy & Tech Debt (2) / 15 Jahre alte Skripte (1) |
| 10 | Team | Teamgeist | Team-Support: Wie lief die gegenseitige Unterstützung im Team? | Großartiger Zusammenhalt (5) / Schnelle Antworten im Chat (4) / Jeder beschäftigt, aber okay (3) / Mehrfach nachhaken nötig (2) / Einzelkämpfer auf verlorenem Posten (1) |
| 11 | Fokus | Anforderungsklarheit | Dokumentation & Stories: Wie klar waren die Anforderungen formuliert? | Kristallklar mit Akzeptanzkriterien (5) / Gute Spezifikation (4) / Pragmatische Annahmen getroffen (3) / Steht mündlich im Titel (2) / Reine Gedankenübertragung nötig (1) |
| 12 | Workload | Tagesantrieb | Morgen-Motivation: Wie leicht fiel dir der Start in den Arbeitstag? | Voller Tatendrang (5) / Gute Energie (4) / Dienst nach Vorschrift (3) / Snooze-Taste mehrfach (2) / Sinnfragen vor dem Bildschirm (1) |
| 13 | Tech | Dev Environment | Lokale Dev-Umgebung: Wie flüssig lief dein Docker- & Build-Setup? | 1-Klick alles rennt (5) / Zuverlässig (4) / Lüfter hebt wie ein R8 ab (3) / Node_modules blockiert (2) / Auf meiner Maschine ging es noch nie (1) |
| 14 | Fokus | Multitasking | Context Switching: Wie oft musstest du zwischen Tasks springen? | Singletasking pur (5) / 2-3 verwandte Themen (4) / Mäßiges Hin und Her (3) / Ständiges Feuerwehr-Spielen (2) / 47 Browser-Tabs offen (1) |
| 15 | Workload | Work-Life-Balance | Feierabend-Abschalten: Wie gut konntest du den Kopf frei bekommen? | Laptop zu, Kopf frei (5) / Schneller Feierabendmodus (4) / Normaler Nachhall (3) / Im Bett über SQL gegrübelt (2) / Im Traum Fehler debuggt (1) |
| 16 | Fokus | Wachstum & Skills | Lern- & Entfaltungskurve: Konntest du etwas Neues dazulernen? | Neues Tool/Pattern gemeistert (5) / Spannender Kniff gelernt (4) / Bekanntes Handwerk (3) / Repetitive Fließbandarbeit (2) / Völliger Stillstand (1) |
| 17 | Team | Stakeholder-Alignment | Stakeholder & PO Alignment: Wie harmonisch lief die Kommunikation? | Partnerschaftliches Vertrauen (5) / Konstruktive Kompromisse (4) / Normales Tauziehen (3) / 3x in 48h umgeworfen (2) / Gestern ganz anders gebraucht (1) |
| 18 | Tech | Qualität & Tests | Test & QA Zuversicht: Wie sicher fühlst du dich mit der Code-Qualität? | 90%+ Coverage, pure Ruhe (5) / Wichtige Pfade abgesichert (4) / Kernelemente getestet (3) / Manuelles Durchklicken (2) / Der Kunde ist der Beta-Tester (1) |
| 19 | Workload | Regeneration | Pausen-Kultur: Wie erholsam waren deine Pausen diese Woche? | Spaziergang & gutes Essen (5) / Halbe Stunde offline (4) / Kurz, aber okay (3) / Sandwich vor der Tastatur (2) | Welche Pause? (1) |
| 20 | Team | Wochen-Modell | Audi Metapher: Wenn diese Woche ein Fahrzeug gewesen wäre, welches? | Audi RS e-tron GT (5) / Audi A6 Avant (4) / Audi Q3 (3) / Audi im Notlaufprogramm (2) / Im Kiesbett gestrandet (1) |

---

## 🚀 Deployment auf Cloudflare Pages

Da die Anwendung rein clientseitig ohne Server auskommt, kann sie in weniger als 60 Sekunden auf Cloudflare Pages bereitgestellt werden:

1. **Build-Befehl**:
   ```bash
   npm run build
   ```
2. **Ausgabe-Verzeichnis**:
   ```bash
   dist
   ```
3. **Node-Version**: 18+ oder 20+.
4. **Umgebungsvariablen**: Keine erforderlich!

---

## 🛠️ Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (auf Port 3000)
npm run dev

# Produktions-Build erzeugen
npm run build
```
