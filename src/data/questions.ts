import { Question, QuestionCategory } from '../types';

export const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; description: string; color: string }
> = {
  collaboration: {
    label: 'Teamwork & Zusammenarbeit',
    description: 'Zusammenhalt, Hilfsbereitschaft & offene Kommunikation',
    color: '#000000'
  },
  culture: {
    label: 'Spaß & Teamkultur',
    description: 'Freude an der Arbeit, Motivation & Wertschätzung',
    color: '#f10202'
  },
  learning: {
    label: 'Lernmöglichkeiten & I&I',
    description: 'Inspect & Adapt, Weiterbildung & Wissensaustausch',
    color: '#333333'
  },
  leadership: {
    label: 'Unterstützung durch Führung',
    description: 'Rückhalt durch Führungskraft, PO und Scrum Master',
    color: '#555555'
  },
  mission: {
    label: 'Mission & Ziele',
    description: 'Klarheit der Sprint-Ziele und Kundennutzen',
    color: '#777777'
  },
  workload: {
    label: 'Workload & Energie',
    description: 'Feierabend, Koffein-Pegel und Office-Balance',
    color: '#999999'
  },
  focus: {
    label: 'Fokus & Output',
    description: 'Ungestörte Deep Work und Sprint-Fortschritt',
    color: '#1a1a1a'
  },
  tech: {
    label: 'Technologie & Qualität',
    description: 'Tooling, Pipelines und saubere Architektur',
    color: '#444444'
  },
  team: {
    label: 'Organisation & Rollen',
    description: 'Moderation und Verantwortungsübernahme im Team',
    color: '#f10202'
  }
};

export const QUESTIONS_POOL: Question[] = [
  {
    id: 1,
    title: 'Teamwork: Wie gut hat die Zusammenarbeit und Abstimmung funktioniert?',
    category: 'collaboration',
    categoryLabel: 'Teamwork & Zusammenarbeit',
    tag: 'Teamwork',
    options: [
      { text: 'Perfekt – nahtlose Absprachen & starker Zusammenhalt', points: 5 },
      { text: 'Gut – produktives Miteinander ohne Reibung', points: 4 },
      { text: 'Solide – normale Abstimmung, kleine Silos', points: 3 },
      { text: 'Hakelig – viele Missverständnisse und Verzögerungen', points: 2 },
      { text: 'Kritisch – Einzelkämpfer statt Teamwork', points: 1 }
    ]
  },
  {
    id: 2,
    title: 'Spaß: Wie viel Freude und Humor hattest du bei der gemeinsamen Arbeit?',
    category: 'culture',
    categoryLabel: 'Spaß bei der Zusammenarbeit',
    tag: 'Spaß & Laune',
    options: [
      { text: 'Großartig – viel gelacht und echte Begeisterung', points: 5 },
      { text: 'Gut – angenehme, positive Stimmung im Team', points: 4 },
      { text: 'Neutral – sachlich abgearbeitet', points: 3 },
      { text: 'Wenig – spürbare Frustration oder Anspannung', points: 2 },
      { text: 'Null – schlechte Laune und bedrückende Atmosphäre', points: 1 }
    ]
  },
  {
    id: 3,
    title: 'Lernmöglichkeiten: Konntest du I&I nutzen oder Neues lernen?',
    category: 'learning',
    categoryLabel: 'Lernmöglichkeiten',
    tag: 'I&I / Lernen',
    options: [
      { text: 'Voll genutzt – aktiv am I&I teilgenommen & Neues gelernt', points: 5 },
      { text: 'Gut – Zeit für Weiterbildung oder Research gehabt', points: 4 },
      { text: 'Teilweise – kurze Recherche neben dem Tagesgeschäft', points: 3 },
      { text: 'Kaum – Weiterbildung musste hinten anstehen', points: 2 },
      { text: 'Gar nicht – 0% Zeit für Lernen oder I&I', points: 1 }
    ]
  },
  {
    id: 4,
    title: 'Führung: Fühlst du dich von Führungskraft / PO / SM unterstützt?',
    category: 'leadership',
    categoryLabel: 'Unterstützung durch Führung',
    tag: 'Führung',
    options: [
      { text: 'Erstklassig – maximaler Rückhalt, Vertrauen & schnelle Hilfe', points: 5 },
      { text: 'Gut – verlässliche Unterstützung bei Bedarf', points: 4 },
      { text: 'Neutral – wie gewohnt, weder positiv noch negativ', points: 3 },
      { text: 'Schwach – wenig Gehör oder zeitraubende Bürokratie', points: 2 },
      { text: 'Fehlend – keine Unterstützung bei Hindernissen', points: 1 }
    ]
  },
  {
    id: 5,
    title: 'Mission & Ziele: Sind die Sprint-Ziele und Prioritäten für dich glasklar?',
    category: 'mission',
    categoryLabel: 'Mission & Ziele',
    tag: 'Mission & Ziele',
    options: [
      { text: 'Glasklar – jeder weiß genau, worauf es ankommt', points: 5 },
      { text: 'Klar – gute Orientierung und verständliche Prioritäten', points: 4 },
      { text: 'Größtenteils – ein paar Details waren offen', points: 3 },
      { text: 'Diffus – ständige Prio-Wechsel und Unruhe', points: 2 },
      { text: 'Völlig unklar – kein roter Faden erkennbar', points: 1 }
    ]
  },
  {
    id: 6,
    title: 'Moderator nächste Woche: Wie gerne würdest du die Teamrunde leiten?',
    category: 'team',
    categoryLabel: 'Team & Moderation',
    tag: 'Moderation',
    options: [
      { text: 'Sehr gerne – ich übernehme freiwillig!', points: 5 },
      { text: 'Gerne, wenn sich sonst niemand meldet', points: 4 },
      { text: 'Neutral – wenn die Reihe an mir ist', points: 3 },
      { text: 'Eher ungern nächste Woche', points: 2 },
      { text: 'Bitte auf keinen Fall!', points: 1 }
    ]
  },
  {
    id: 7,
    title: 'Kaffee-Konsum: Wie viele Tassen hast du im Schnitt pro Tag gebraucht?',
    category: 'workload',
    categoryLabel: 'Workload & Energie',
    tag: 'Koffein',
    options: [
      { text: '0–1 Tassen (Entspannt / kaum Koffein nötig)', points: 5 },
      { text: '2–3 Tassen (Normaler Standard-Modus)', points: 4 },
      { text: '4–5 Tassen (Erhöhter Bedarf / spürbarer Druck)', points: 3 },
      { text: '6–7 Tassen (Hoher Puls / Koffein als Treibstoff)', points: 2 },
      { text: '8+ Tassen (Dauer-Infusion nötig)', points: 1 }
    ]
  },
  {
    id: 8,
    title: 'Motivation: Wie viel Lust hattest du heute auf die Teamrunde?',
    category: 'culture',
    categoryLabel: 'Spaß bei der Zusammenarbeit',
    tag: 'Teamrunde',
    options: [
      { text: 'Sehr hoch – freue mich auf den offenen Austausch', points: 5 },
      { text: 'Gut motiviert dabei', points: 4 },
      { text: 'Neutral – gehört halt zur Routine', points: 3 },
      { text: 'Eher gering – viel anderes auf dem Tisch', points: 2 },
      { text: 'Null Bock – hätte eine Mail sein können', points: 1 }
    ]
  },
  {
    id: 9,
    title: 'Präsenz: Wie war deine Aufteilung Office vs. Home Office?',
    category: 'workload',
    categoryLabel: 'Workload & Balance',
    tag: 'Office / HO',
    options: [
      { text: 'Perfekte Balance (ideale Tage vor Ort & HO)', points: 5 },
      { text: 'Guter Mix mit wertvollem Team-Austausch', points: 4 },
      { text: 'Ausgeglichen (ca. 50 / 50)', points: 3 },
      { text: 'Suboptimal – wenig direkter Kontakt zum Team', points: 2 },
      { text: 'Ungünstig – Verhältnis passte diese Woche gar nicht', points: 1 }
    ]
  },
  {
    id: 10,
    title: 'Spätester Feierabend: Was war deine längste Arbeitszeit diese Woche?',
    category: 'workload',
    categoryLabel: 'Workload & Zeit',
    tag: 'Arbeitszeit',
    options: [
      { text: 'Vor 16:30 Uhr (Pünktlicher, entspannter Feierabend)', points: 5 },
      { text: '16:30 – 17:30 Uhr (Reguläre Dienstzeit)', points: 4 },
      { text: '17:30 – 18:30 Uhr (Etwas länger geblieben)', points: 3 },
      { text: '18:30 – 20:00 Uhr (Später Abend / Überstunden)', points: 2 },
      { text: 'Nach 20:00 Uhr (Nachtschicht / Crunch-Modus)', points: 1 }
    ]
  },
  {
    id: 11,
    title: 'Sprint-Punkte: Wie viele Punkte würdest du dir für die Woche geben?',
    category: 'focus',
    categoryLabel: 'Fokus & Output',
    tag: 'Sprint-Punkte',
    options: [
      { text: '10+ Punkte (Viel geschafft & sauber geliefert)', points: 5 },
      { text: '7–9 Punkte (Guter, solider Wochen-Output)', points: 4 },
      { text: '4–6 Punkte (Normaler Wochendurchschnitt)', points: 3 },
      { text: '1–3 Punkte (Viel blockiert / wenig Durchsatz)', points: 2 },
      { text: '0 Punkte (Nur Brände gelöscht & blockiert gewesen)', points: 1 }
    ]
  },
  {
    id: 12,
    title: 'Deep Work: Wie viel ungestörte Fokuszeit hattest du zum Arbeiten?',
    category: 'focus',
    categoryLabel: 'Fokus & Output',
    tag: 'Deep Work',
    options: [
      { text: '>70% Fokuszeit – wunderbare Konzentrationsphasen', points: 5 },
      { text: '50–70% – solide Arbeitsblöcke ohne Störung', points: 4 },
      { text: '30–50% – oft durch Pings und Meetings zerrissen', points: 3 },
      { text: '15–30% – ständige Unterbrechungen', points: 2 },
      { text: '<15% – reines Meeting-Pingpong und Dauerkonflikte', points: 1 }
    ]
  },
  {
    id: 13,
    title: 'Tooling & IT: Wie stabil liefen Pipelines, Repos und Dev-Umgebung?',
    category: 'tech',
    categoryLabel: 'Technologie & Qualität',
    tag: 'Tooling & CI/CD',
    options: [
      { text: 'Absolut stabil – alles lief schnell und zuverlässig', points: 5 },
      { text: 'Gut – nur minimale, unkritische Verzögerungen', points: 4 },
      { text: 'Akzeptabel – kleinere Ausfälle oder langsame Builds', points: 3 },
      { text: 'Nervig – häufige Pipeline-Hänger und Tool-Probleme', points: 2 },
      { text: 'Katastrophe – stundenlang durch Infrastruktur blockiert', points: 1 }
    ]
  },
  {
    id: 14,
    title: 'Wertschätzung: Hast du ehrliches Feedback oder Anerkennung erlebt?',
    category: 'culture',
    categoryLabel: 'Spaß bei der Zusammenarbeit',
    tag: 'Anerkennung',
    options: [
      { text: 'Sehr viel – tolle Kudos und spürbare Wertschätzung', points: 5 },
      { text: 'Ja – positives Feedback für die geleistete Arbeit', points: 4 },
      { text: 'Normal – weder Lob noch Tadel', points: 3 },
      { text: 'Wenig – Arbeit wird als selbstverständlich hingenommen', points: 2 },
      { text: 'Gar keine – man fühlt sich unsichtbar', points: 1 }
    ]
  },
  {
    id: 15,
    title: 'Fehlerkultur: Konntest du Probleme oder Fehler offen ansprechen?',
    category: 'collaboration',
    categoryLabel: 'Teamwork & Zusammenarbeit',
    tag: 'Fehlerkultur',
    options: [
      { text: '100% – absolute psychologische Sicherheit im Team', points: 5 },
      { text: 'Offen – konstruktiver Umgang mit Fehlern', points: 4 },
      { text: 'Bedingt – hängt vom jeweiligen Gegenüber ab', points: 3 },
      { text: 'Eher gehemmt – man überlegt zweimal vor Wortmeldung', points: 2 },
      { text: 'Schlecht – Schuldzuweisungen und Vorwürfe', points: 1 }
    ]
  },
  {
    id: 16,
    title: 'Regeneration: Konntest du nach der Arbeit wirklich abschalten?',
    category: 'workload',
    categoryLabel: 'Workload & Balance',
    tag: 'Abschalten',
    options: [
      { text: 'Perfekt – Akku voll, Kopf völlig frei am Feierabend', points: 5 },
      { text: 'Gut – konnte mich schnell entspannen', points: 4 },
      { text: 'Mäßig – Gedanken kreisten noch etwas um Tickets', points: 3 },
      { text: 'Schlecht – schlecht geschlafen oder am Abend gegrübelt', points: 2 },
      { text: 'Überhaupt nicht – Dauerstress und Reizüberflutung', points: 1 }
    ]
  },
  {
    id: 17,
    title: 'Entscheidungen: Wurden offene Fachfragen schnell & pragmatisch geklärt?',
    category: 'leadership',
    categoryLabel: 'Unterstützung durch Führung',
    tag: 'Entscheidungen',
    options: [
      { text: 'Sofort – mutige, pragmatische Entscheidungen ohne Verzögerung', points: 5 },
      { text: 'Zügig – offene Punkte wurden schnell ausgeräumt', points: 4 },
      { text: 'Normal – mit etwas Abstimmungsaufwand verbunden', points: 3 },
      { text: 'Zäh – lange Schleifen und unklare Zuständigkeiten', points: 2 },
      { text: 'Blockiert – Endlos-Diskussionen ohne greifbares Ergebnis', points: 1 }
    ]
  },
  {
    id: 18,
    title: 'Code-Qualität: Wie zufrieden bist du mit Architektur & Code-Basis?',
    category: 'tech',
    categoryLabel: 'Technologie & Qualität',
    tag: 'Code-Qualität',
    options: [
      { text: 'Top – sauberer, testbarer Code und zukunftsfähiges Design', points: 5 },
      { text: 'Gut – ordentliche Qualität bei überschaubaren Schulden', points: 4 },
      { text: 'Mittelmaß – funktioniert, aber einige Altlasten', points: 3 },
      { text: 'Kritisch – zunehmende Tech-Debts und fragile Stellen', points: 2 },
      { text: 'Albtraum – Spaghetti-Code bremst jede Neuentwicklung', points: 1 }
    ]
  },
  {
    id: 19,
    title: 'Kundennutzen: Hattest du das Gefühl, echten Mehrwert zu schaffen?',
    category: 'mission',
    categoryLabel: 'Mission & Ziele',
    tag: 'Kunden-Impact',
    options: [
      { text: 'Stark spürbar – sichtbarer Nutzen für Audi und Nutzer', points: 5 },
      { text: 'Guter Mehrwert – Fortschritt auf der Roadmap geliefert', points: 4 },
      { text: 'Teilweise – viele interne Tasks ohne direkten Bezug', points: 3 },
      { text: 'Gering – viel Formalismus und wenig spürbarer Output', points: 2 },
      { text: 'Null – reine Scheinaktivität ohne wirklichen Zweck', points: 1 }
    ]
  },
  {
    id: 20,
    title: 'Hilfsbereitschaft: Stand dir jemand zur Seite, wenn du Hilfe brauchtest?',
    category: 'collaboration',
    categoryLabel: 'Teamwork & Zusammenarbeit',
    tag: 'Hilfsbereitschaft',
    options: [
      { text: 'Sofort – jemand war direkt zur Stelle (z.B. Pair-Programming)', points: 5 },
      { text: 'Schnell – innerhalb kürzester Zeit Hilfe bekommen', points: 4 },
      { text: 'Nach Wartezeit – Unterstützung kam mit Verzögerung', points: 3 },
      { text: 'Mühsam – man musste mehrfach nachhaken', points: 2 },
      { text: 'Allein gelassen – niemand fühlte sich zuständig', points: 1 }
    ]
  }
];

export const getQuestionById = (id: number): Question | undefined => {
  return QUESTIONS_POOL.find((q) => q.id === id);
};
