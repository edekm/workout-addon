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
    'Nogi naprzemienie w przód/tył jak na orbitreku. Tempo łatwe - to mobilność bioder i rozgrzewka, nie intensywne cardio. Trzymaj się uchwytów dla balansu.',
  'chin-up':
    'Jak pull-up ale podchwytem (dłonie do siebie). Łatwiejszy bo angażuje biceps. Ramiona w pełni wyprostowane na dole, broda nad drążkiem na górze. Łokcie w dół i w tył, łopatki ściągnięte.',
  'pike-push-up':
    'Pozycja V (psia poza): biodra wysoko, ręce i stopy na ziemi, ciężar przesunięty na ręce. Opuszczaj głowę do ziemi między dłońmi (jakbyś robił handstand push-up), wypchnij się. Im więcej ciężaru na ręce, tym ciężej.',
  'ring-push-up':
    'Pompka z chwytem za kółka (kółka kilka cm nad ziemią). Niestabilność wymusza ekstra pracę barków i klatki. Łokcie blisko ciała. RTO = na górze obracasz kółka palcami na zewnątrz - dodatkowa praca dla mięśni stabilizujących.',
  squat:
    'Stopy na szerokości barków, palce lekko na zewnątrz. Schodź jakbyś siadał na krzesło - biodra w tył i w dół, kolana w linii ze stopami. Pełen zakres = uda poniżej równoległej. Plecy proste, klatka wysoko. Wstań przez pięty.',
  lunge:
    'Krok w przód, opuszczaj się aż tylne kolano niemal dotknie ziemi. Przednie kolano nad piętą, nie wychodzi poza palce. Tułów pionowo. Wstań przez piętę przedniej nogi. Reverse = krok w tył.',
  'step-up':
    'Postaw stopę całą na ławce, oprzyj się przez piętę i wjedź na górę nie pomagając sobie tylną nogą. Powoli opuść tylną nogę z powrotem. Tempo kontrolowane - nie odbijaj się od ziemi.',
  'calf-raise':
    'Stań na palcach jak najwyżej, pauza 1s na górze, kontrolowanie opuść aż pięty dotkną ziemi (lub niżej z deficyt z krawędzi). Pełen zakres ruchu. Single-leg = dużo trudniej.',
  'hollow-body-hold':
    'Leż na plecach. Dolna część pleców wciśnięta w ziemię (NIE odrywaj jej). Ręce wyciągnięte za głowę, nogi proste i uniesione nisko. Spinaj brzuch - im niżej nogi i ręce, tym ciężej. Tuck = kolana zgięte.',
  'sit-up':
    'Ławka pozioma lub pochylona. Stopy zaczepione pod wałkami. Krzyżuj ręce na klatce, podnoś tułów do kolan przez spinanie brzucha. Powoli opuszczaj. Decline = ławka pochyła, trudniej. V-up = ręce i nogi spotykają się w powietrzu.',
  'l-sit':
    'Chwyt za poręcze dipowe lub kółka. Podnieś nogi - tuck = zgięte, full = proste, równolegle do ziemi (litera L). Spinaj brzuch, ramiona wyprostowane wpychasz w dół. Trudne ćwiczenie - zaczynaj od krótkich holdów.',
  'muscle-up':
    'Wybuchowe podciągnięcie + przejście przez drążek/kółka do pozycji wsparcia (jak na początku dipa). Wymaga 8-10 strict pull-ups jako baza. Na kółkach prościej niż na drążku. Trening transition drill = pauzowanie nad drążkiem.',
  'front-lever':
    'Zwis na drążku/kółkach z prostymi ramionami, podnosisz ciało do poziomu - całe ciało równoległe do ziemi, twarzą do góry. Skala trudności przez kąt nóg: tuck (zgięte) → advanced tuck → straddle → full. Mocno spinaj brzuch i pośladki.',
  handstand:
    'Pozycja do góry nogami, oparcie tylko na rękach. Najpierw uczysz się przy ścianie (chest-to-wall = brzuch do ściany, najlepsza forma; back-to-wall = plecy do ściany, łatwiejszy wejście). Ciało wyciągnięte w jedną linię, ramiona aktywne, brzuch i pośladki spięte.',
  'shoulder-dislocations':
    'Trzymaj kij/ręcznik/gumę szeroko przed sobą, ramiona proste. Powoli przeprowadź go nad głową aż za plecy, potem z powrotem. Im węższy chwyt, tym trudniej. Otwiera barki przed pull/push - rób zawsze przed treningiem.',
  'scap-circles':
    'Zawiśnij na drążku z prostymi ramionami. Wykonuj kółka łopatkami (nie ramieniami): w górę, w tył, w dół, do przodu. Powoli, kontrolowanie. Aktywuje łopatki i mięśnie pleców przed pull-upami.'
};

export function ensureTechniques(db: Database.Database) {
  const stmt = db.prepare(
    `UPDATE exercises SET technique_md = ?
     WHERE slug = ? AND (technique_md IS NULL OR technique_md = '')`
  );
  const tx = db.transaction(() => {
    for (const [slug, text] of Object.entries(TECHNIQUES)) {
      stmt.run(text, slug);
    }
  });
  tx();
}
