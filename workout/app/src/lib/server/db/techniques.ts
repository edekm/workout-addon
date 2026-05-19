import type Database from 'better-sqlite3';

export const TECHNIQUES: Record<string, string> = {
  'pull-up':
    'Zawiśnij na drążku nachwytem (palce w stronę od ciebie), ramiona całkowicie wyprostowane. Ściągnij łopatki, podciągnij ciało aż broda znajdzie się nad drążkiem. Opuszczaj kontrolowanie ~2s. Nie bujaj się.',
  'ring-row':
    'Złap kółka, oprzyj pięty o ziemię, ciało prosto jak deska. Im niżej kółka i bardziej pozioma pozycja, tym trudniej. Pociągnij klatkę do kółek, łokcie blisko ciała, łopatki ściągnięte. Powoli opuść.',
  'push-up':
    'Dłonie na szerokości barków, palce skierowane do przodu. Ciało prosto, łokcie ~45° od tułowia. Opuszczaj klatkę do ziemi, dotknij lub niemal dotknij, wypchnij się. Brzuch i pośladki napięte cały czas.',
  dip: 'Wskocz na poręcze, ramiona wyprostowane, ciało lekko pochylone do przodu (klatka) lub pionowe (triceps). Opuszczaj się aż barki będą poniżej łokci (mocno!), wypchnij się. Bez machania nogami.',
  'bulgarian-split-squat':
    'Stań przodem od ławki, tylną nogę oprzyj na ławce stopą lub grzbietem. Przednia stopa 50-70cm przed ławką. Opuszczaj biodro w dół i lekko w przód, kolano przedniej nogi nad palcami. Wstań przez piętę przedniej nogi.',
  'glute-bridge':
    'Leż na plecach, kolana ugięte, stopy płasko na ziemi blisko pośladków. Spróbuj rozcisnąć ziemię piętami i wypchnij biodra w górę aż tułów - uda są w jednej linii. Ściśnij mocno pośladki na górze (2s). Powoli opuść.',
  plank:
    'Oprzyj się na przedramionach (łokcie pod barkami) i palcach stóp. Ciało prosto - od pięt po głowę. Pośladki, brzuch i nogi napięte. Nie unoś biodra, nie obniżaj. Oddychaj spokojnie nosem.',
  'hanging-knee-raise':
    'Zawiśnij na drążku z prostymi ramionami. Bez bujania - podciągnij kolana do klatki używając brzucha (nie bioder). Pauza 0.5s na górze. Powoli opuść. Im wolniej, tym ciężej.',
  bike: 'Cardio: dostosuj opór, utrzymuj kadencję ~70-90 rpm. Steady-state = równe tempo cały czas. Interwały = szybko/wolno na zmianę. Tabata = 20s max wysiłku / 10s odpoczynku.',
  'air-walker':
    'Nogi naprzemienie w przód/tył jak na orbitreku. Tempo łatwe - to mobilność bioder i rozgrzewka, nie intensywne cardio. Trzymaj się uchwytów dla balansu.'
};

export function ensureTechniques(db: Database.Database) {
  const stmt = db.prepare('UPDATE exercises SET technique_md = ? WHERE slug = ? AND (technique_md IS NULL OR technique_md = "")');
  const tx = db.transaction(() => {
    for (const [slug, text] of Object.entries(TECHNIQUES)) {
      stmt.run(text, slug);
    }
  });
  tx();
}
