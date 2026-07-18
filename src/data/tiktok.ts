import type { Category, Idea, TikTokConcept, TikTokSlide } from '../lib/types'
import { HOOKS_EXTRA, PAYOFFS_EXTRA } from './tiktok-hooks'

// TikTok Photo-Mode Generator.
// Prinzipien (was auf TikTok viral geht):
//  - 1-2 Slides max: kurze Aufmerksamkeitsspanne, hohe Completion-Rate = mehr Push.
//  - Slide 1 stoppt den Daumen in <1 s: Schmerz, Neugier, Selbstironie, POV.
//  - Ton: kleingeschrieben, gesprochen, ehrlich — wie eine Nachricht an einen Freund,
//    nicht wie eine Anzeige. Genau das unterscheidet TikTok von Instagram.
//  - Trending Sound ist der #1 Reichweiten-Hebel — wichtiger als das Bild.
//  - Wenige Hashtags (4-6), Mix #fyp / breit / Nische.

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  return out
}

// Slide 1 = der Hook. Bewusst menschlich: klein geschrieben, Umgangston,
// Selbstironie, direkte Ansprache. Kein Marketing-Deutsch.
//
// Ziel: Hunderte echte, unterschiedliche Hooks pro Kategorie — klingt wie
// ein mensch, der wirklich trainiert, nicht wie eine anzeige. Konkrete zahlen,
// echte übungen (bank, kniebeuge, kreuzheben, klimmzüge), gym-momente,
// selbstironie. Der hook stoppt den daumen, das produkt kommt erst im payoff.
const HOOKS: Record<Category, ((i: Idea) => string)[]> = {
  education: [
    () => 'ich hab 2 jahre trainiert,\nohne zu wissen, ob ich\nüberhaupt stärker werde.\n\nsei schlauer als ich.',
    () => 'keiner sagt dir das im gym:\n\ndein plan ist egal,\nwenn du ihn nicht misst.',
    () => 'okay, klingt langweilig,\naber das eine ding hat\nmein training komplett\nverändert:',
    () => 'du musst nicht härter\ntrainieren.\n\ndu musst wissen,\nwas letzte woche ging.',
    () => 'sachen, die ich gern\nan tag 1 gewusst hätte\n\n(teil 1)',
    () => 'dein muskel weiß nicht,\nwie motiviert du bist.\n\ner kennt nur gewicht\nund wiederholungen.',
    () => 'trainierst du hart\noder trainierst du\nnur lange?\n\nes gibt einen weg,\ndas rauszufinden.',
    () => 'ich dachte 2 jahre,\nich hätte schlechte genetik.\n\ndann hab ich angefangen\nzu messen. lag nicht an\nder genetik.',
    () => 'ehrlich gesagt:\ndein „plateau“ ist meistens\nnur fehlende buchführung.',
    () => 'wenn du nur EINE sache\nan deinem training änderst,\ndann die hier:',
    () => 'niemand redet darüber,\nwie viel fortschritt\nim aufschreiben steckt.',
    () => 'dinge, die mehr bringen\nals ein neuer pre-workout:\n\n(weiter wischen)',
    () => 'progressive overload\nin einem satz:\n\nnächstes mal 1 wdh\noder 2,5 kg mehr\nals das, was da steht.',
    () => 'das prinzip hinter jedem\nguten trainingsplan\npasst auf einen bierdeckel:\n\nmess es. steiger es.',
    () => 'kurze mathe:\n2,5 kg mehr pro monat\n= 30 kg mehr im jahr.\n\nwenn du es nachhältst.',
    () => 'die meisten stagnieren nicht,\nweil sie faul sind.\n\nsie stagnieren, weil sie\njede woche dasselbe\ngewicht raten.',
    () => 'warum dein pump nichts\nüber fortschritt sagt:\n\n(kurzer thread)',
    () => 'die wahrheit über\n„train hard“:\n\nhart ohne zahlen ist\nnur schwitzen.',
    () => 'so erkennst du in\n30 sekunden, ob dein\nplan funktioniert:',
    () => 'ich erklär progressive\noverload meiner oma —\n\nund plötzlich versteht\nsie es besser als\nhalb instagram.',
    () => '3 dinge, die stärker\nmachen, und keins davon\nist ein supplement:',
    () => 'du machst seit monaten\ndieselben 3x10.\n\ndas ist kein training,\ndas ist ein ritual.',
    () => 'kleiner realitätscheck:\n\nwenn du dein letztes\ngewicht nicht kennst,\nkennst du auch deinen\nfortschritt nicht.',
    () => 'warum profis alles\naufschreiben und\nanfänger nach gefühl gehen:',
    () => 'das langweiligste\ntraining-prinzip ist\nauch das einzige,\ndas immer funktioniert.',
    () => 'spoiler:\ndeine app mit dem\nsocial feed macht dich\nnicht stärker.\n\ndaten schon.',
    () => 'wie viel wiegt „mittel-\nschwer“?\n\ngenau. keiner weiß es.\ndeshalb schreib es auf.',
    () => 'ich hab mal 8 wochen\nnach gefühl trainiert.\n\ndann 8 wochen mit log.\n\nrat mal, welche 8 wochen\ngewachsen sind.',
    () => 'volumen, intensität,\nfrequenz —\n\nklingt kompliziert, ist\naber nur: wie oft, wie\nschwer, wie viel.',
    () => 'der teuerste fehler im gym\nkostet 0 €:\n\nnicht wissen, was du\nletztes mal gemacht hast.',
    () => 'form vor gewicht,\nja.\n\naber gewicht MERKEN\nvor allem anderen.',
    () => 'jeder redet über den\nperfekten split.\n\nkeiner über das ding,\ndas ihn überhaupt erst\nfunktionieren lässt:\nnachhalten.',
    () => 'warum du dich stärker\nfühlst, aber die zahlen\nstillstehen:',
    () => 'trainings-tipp, den mir\nkein coach je gesagt hat,\nsondern ein blatt papier:',
    () => 'deload, wenn nötig.\naber woher weißt du,\nwann es nötig ist?\n\nnur aus deinen zahlen.',
    () => 'die 2-sekunden-regel,\ndie 2 jahre training\nrettet:\n\nsatz fertig → gewicht\nnotiert.',
    () => 'schlechte nachricht:\ngenetik gibt es.\n\ngute nachricht:\ndie meisten nutzen ihre\nnicht mal aus, weil sie\nnichts steigern.',
    () => 'was „nichts geht mehr“\nwirklich heißt:\n\nmeistens hast du nur\nvergessen, dass letzte\nwoche weniger ging.',
    () => 'lerne aus meinen\n2 verlorenen jahren\nin 15 sekunden:',
    () => 'das erste, was ich jedem\nanfänger sage, hat nichts\nmit übungen zu tun.',
    () => 'wieso „viel essen und\nviel trainieren“ ohne\nnummern nur die hälfte\nist:',
    () => 'realtalk über gains:\ndein körper reagiert auf\nreize, nicht auf gute\nabsichten.',
  ],
  problem: [
    () => 'du gehst 5x die woche\nins gym und weißt trotzdem\nnicht, ob du fortschritt\nmachst?\n\nja. genau du.',
    () => 'sag mir, dass du dein\ntraining nicht trackst,\nohne es mir zu sagen:\n\n„was hatte ich letztes\nmal nochmal drauf?“',
    () => 'dein bankdrücken steht\nseit 6 monaten und du\nnennst es „plateau“.\n\nes ist kein plateau.',
    () => 'dein training ist nicht\nschlecht.\n\ndu siehst nur nicht,\nwas funktioniert.',
    () => 'pov: du fängst zum\n4. mal von vorne an,\nweil keiner mehr weiß,\nwo du warst.',
    () => 'pov: die hantel fühlt sich\nschwerer an als letzte woche.\n\nund du weißt nicht mal,\nob sie das wirklich ist.',
    () => 'du erinnerst dich an\njeden song von 2015.\n\naber nicht an dein\nkreuzheben von dienstag.',
    () => 'du zahlst 40 € im monat\nfürs gym.\n\nund weißt am ende der\nwoche nicht, was du\ndafür bekommen hast.',
    () => 'niemand:\n\ndu am rack:\n„war das jetzt 60\noder 62,5?“',
    () => 'wer nichts misst,\ntrainiert auf hoffnung.\n\nund hoffnung baut\nkeine muskeln.',
    () => 'ihr fragt euch, warum\nihr nicht wachst.\n\nich frag euch: was stand\nletzte woche auf der\nstange?',
    () => 'dein trainingsplan lebt\nnur in deinem kopf?\n\ndann stirbt er in jeder\nstressigen woche neu.',
    () => 'kennst du das:\ndu stehst vor der stange\nund rechnest 5 minuten,\nwas du letztes mal\ndraufhattest?',
    () => 'die 3 gefährlichsten\nwörter im gym:\n\n„irgendwas mit 70“',
    () => 'du hast heute gepusht\nbis zum versagen.\n\nund weißt in 2 tagen\nnicht mehr, bei welchem\ngewicht.',
    () => 'jeder im gym mit handy:\nposten.\n\nkeiner: sein letztes\ngewicht nachschauen.',
    () => 'du hast einen plan.\nauf einem zettel.\nden du zu hause\nliegen lässt.',
    () => 'sei ehrlich:\nwann hast du das letzte\nmal wirklich gesteigert\nund nicht nur „ungefähr\ndasselbe“ gemacht?',
    () => 'sag mir, dass du im\ngym rätst, ohne es mir\nzu sagen:\n\n„nehm ich heut 10er\noder 12er?“',
    () => 'das problem ist nicht\ndein einsatz.\n\ndas problem ist, dass\nkeiner mitschreibt.',
    () => 'du trainierst seit einem\njahr und dein bankdrücken\nist genau da, wo es\nvor einem jahr war.\n\nzufall? nein.',
    () => 'unbeliebte wahrheit:\n„ich hör auf meinen\nkörper“ heißt oft nur\n„ich hab keine ahnung,\nwas ich letztes mal\ngemacht hab“.',
    () => 'jedes gym hat diesen typ,\nder seit 2 jahren mit\ndenselben 20 kg curlt.\n\nsei nicht der typ.',
    () => 'du gibst 100 % im satz.\nund 0 % beim merken,\nwas der satz war.',
    () => 'dein schwachpunkt ist\nnicht deine brust.\n\ndein schwachpunkt ist\ndein gedächtnis.',
    () => 'wie oft warst du diese\nwoche im gym?\nund wie viel davon\nkönntest du in zahlen\nbeweisen?',
    () => 'du: „ich stagniere.“\nauch du: kannst nicht\nsagen, was du vor\n4 wochen gehoben hast.',
    () => 'zwischen „ich glaub, das\nwird schwerer“ und\n„das IST schwerer“\nliegt dein ganzer\nfortschritt.',
    () => 'gym-horror in 3 worten:\n\n„handy war voll.“\n(alle notizen weg.)',
    () => 'du optimierst supplements,\nschlaf und pre-workout —\n\nund weißt nicht mal,\nwas du letzten montag\ngehoben hast.',
    () => 'realtalk:\ndein zettel im spind\nist auch nur ein tracker,\nnur ein richtig schlechter.',
    () => 'du merkst dir deinen\nkaffee-verlauf besser\nals deinen\ntrainingsverlauf.',
    () => 'du hast keinen mangel\nan motivation.\n\ndu hast einen mangel\nan überblick.',
    () => 'jedes „ich glaub, war\netwas mehr“ ist ein\ntag training, den du\nnie beweisen kannst.',
    () => 'pov: neuer split, woche 1,\nund du hast schon\nvergessen, mit welchem\ngewicht du gestartet\nbist.',
    () => 'du: 5 apps für alles.\ndein training: ein\nverknickter zettel\nin der hosentasche.',
    () => 'warum sich dein\ntraining anstrengend\nanfühlt, aber die\nfotos gleich bleiben:',
    () => 'ganz ehrlich, wie viele\nvon euren letzten\n10 sätzen könntet ihr\ngerade aufsagen?',
    () => 'das gefühl, wenn du\nmerkst: die letzten\n3 monate warst du\neigentlich nur\nanwesend.',
    () => 'du machst progressive\noverload?\n\ncool. beweis es.',
    () => 'kein plan überlebt eine\nstressige woche —\n\naußer du hast ihn\naufgeschrieben.',
    () => 'du hast dich nicht\nverschlechtert.\n\ndu hast nur nie\naufgeschrieben, wie gut\ndu schon warst.',
  ],
  feature: [
    () => 'ich hab mir die gym-app\ngebaut, die ich selbst\nimmer gebraucht hab.',
    () => 'mein gedächtnis: weg.\nmeine gains: dokumentiert.',
    () => 'kein feed. keine werbung.\nnur dein training.\n\nso sollte eine gym-app\naussehen.',
    () => '30 sekunden nach dem satz\nweißt du genau, ob du\nbesser geworden bist.',
    i => i.title + '.',
    () => 'keine ads. kein feed.\nkein abo-zwang.\n\nnur dein training.\n\nhab ich selbst gebaut.',
    () => 'student baut gym-app,\nweil alle anderen\nzu viel wollten.\n\n(teil 1: warum)',
    () => 'zeig mir dein letztes\nworkout in 3 sekunden.\n\nich warte.\n\n…meine app kann das.',
    () => 'features, die keiner braucht:\nein social feed im\ngym-tracker.\n\nwas du wirklich brauchst:\ndein letztes gewicht,\nsofort da.',
    () => 'meine app weiß mehr\nüber mein training\nals ich selbst.\n\ngenau das ist der punkt.',
    () => 'ich wollte keine app\nmit 200 funktionen.\n\nich wollte eine, die\neine sache richtig macht:\nfortschritt zeigen.',
    () => 'die letzten zahlen deiner\nübung stehen direkt da,\nwenn du sie brauchst.\n\nkein blättern. kein raten.',
    () => 'ich hab jede gym-app\nprobiert.\n\ndann hab ich meine\neigene gebaut, weil\nkeine einfach nur\nnachhalten wollte.',
    () => 'sachen, die meine app\nabsichtlich NICHT kann:\n\n– stories\n– likes\n– werbung\n\nbitte, gern geschehen.',
    () => 'jede zahl, die du je\ngehoben hast, an einem\nort.\n\ndas war der ganze plan.',
    () => 'ich öffne die app,\nseh mein letztes\nbankdrücken, leg 2,5 kg\ndrauf.\n\nfertig ist progressive\noverload.',
    () => 'pov: du legst dich unter\ndie stange und weißt\nsofort, was du schlagen\nmusst.',
    () => 'andere gym-apps: erst\nregistrieren, abo, tutorial.\n\nmeine: aufmachen, satz\neintragen, weiter.',
    () => 'ich hab keinen marketing-\netat.\n\nich hab nur eine app,\ndie genau das macht,\nwas sie soll.',
    () => 'die app zeigt dir schwarz\nauf weiß, dass du in\n8 wochen stärker\ngeworden bist.\n\nnichts motiviert mehr\nals das.',
    () => 'als jemand, der selbst\ntrainiert, hab ich alles\nweggelassen, was mich\nim gym nervt.',
    () => '3 taps und dein satz\nsteht.\n\nlänger darf tracken\nnicht dauern, sonst\nmacht es keiner.',
    () => 'ich zeig dir die einzige\nzahl, die im gym zählt —\nund meine app zeigt sie\ndir zuerst.',
    () => 'kein login-wall,\nkein „premium ab 9,99“\nmitten im satz.\n\nnur du und deine zahlen.',
    () => 'meine app hat null\nbenachrichtigungen,\ndie dich zurückholen\nwollen.\n\ndeine gains holen dich\nzurück.',
    () => 'ich hab die überflüssigen\n90 % weggelassen und die\nwichtigen 10 % richtig\ngemacht.',
    () => 'du brauchst kein\npersonal training,\num zu sehen, ob du\nbesser wirst.\n\ndu brauchst zwei zahlen\nnebeneinander.',
    () => 'was passiert, wenn ein\ngym-nerd eine gym-app\nfür gym-nerds baut:',
    () => 'jeder screenshot in\ndieser app ist ein\nbeweis, dass sich das\ntraining lohnt.',
    () => 'ich hab die app so\ngebaut, dass du sie\nzwischen zwei sätzen\nkomplett bedienen\nkannst.',
    () => 'kein feed heißt:\nniemand ist stärker\nals du auf deinem\nbildschirm.\n\nnur du gegen letzte\nwoche.',
    () => 'die app erinnert sich,\ndamit du dich aufs\nheben konzentrieren\nkannst.',
    () => 'ich hab aufgehört, mein\ntraining zu raten, als\nich aufgehört hab, mein\ntraining zu vergessen.\n\ndafür ist die app da.',
    () => 'stell dir vor, du weißt\nbei jeder übung sofort\ndein bestes gewicht.\n\ngenau das baut die app.',
    () => 'das schönste feature\nist kein feature:\n\nes ist die stille, wenn\ndich nichts ablenkt.',
    () => 'ich hab die app für\nmich gebaut. dann haben\nfreunde sie gewollt.\ndann der app store.',
    () => 'kein influencer, kein budget,\nkein team.\n\nnur eine app, die ich\njeden tag selbst benutze.',
    () => 'mach deinen fortschritt\nsichtbar.\n\nnicht spürbar. sichtbar.\nin zahlen.',
    () => 'wenn deine gym-app dich\nnicht in 3 sekunden\nzu deinem letzten\ngewicht bringt,\n\nist es die falsche app.',
    () => 'ich zeig dir mein log\nnach 1 jahr.\n\nkeine story, keine likes —\nnur eine kurve, die\nnach oben geht.',
  ],
  motivation: [
    () => 'woche 1 postet niemand.\nwoche 52 posten alle.\n\nfang einfach an.',
    () => 'du brauchst keine\nmotivation.\n\ndu brauchst einen plan\nund ein log.',
    () => 'in 6 monaten wünschst\ndu dir, du wärst heute\ngestartet.\n\ndas hier ist dein zeichen.',
    () => 'niemand klatscht bei\nsatz 1.\n\naber satz 1 steht für\nimmer in deinem log.',
    () => 'schlechtes workout?\negal. steht trotzdem im log.\nzählt trotzdem.',
    () => 'der typ mit 140 kg bank\nhat auch mal mit der\nleeren stange angefangen.\n\nund es aufgeschrieben.',
    () => 'du bist nicht zu spät dran.\n\ndu bist genau eine\nentscheidung entfernt.',
    () => 'dein zukünftiges ich\nschaut gerade zu,\nwas du heute machst.',
    () => 'motivation ist überbewertet.\n\nsysteme gewinnen.',
    () => 'schlechter tag? geh trotzdem.\nhalbe kraft? logg trotzdem.\n\nkonstanz schlägt alles.',
    () => 'ein jahr ab heute\nwirst du dir danken.\n\noder es wieder verschieben.\ndeine wahl.',
    () => 'diszipliniert wirken\nwollen alle.\n\ndiszipliniert nachhalten\nfast niemand.',
    () => 'du wirst den tag nie\nbereuen, an dem du\ntrotzdem hingegangen bist.',
    () => 'die besten im gym sind\nnicht die motiviertesten.\n\nes sind die, die einfach\nnie aufgehört haben.',
    () => 'niemand fühlt sich vor\njedem training bereit.\n\ndie starken gehen\neinfach trotzdem.',
    () => 'dein einziger gegner\nsteht in deinem log:\n\ndu von letzter woche.',
    () => 'stell dir vor, du siehst\nin einem jahr zurück\nund JEDES workout\nsteht schwarz auf weiß\nda.\n\nfang heute an.',
    () => 'der plan muss nicht\nperfekt sein.\n\ner muss nur\naufgeschrieben und\nangefangen sein.',
    () => 'kleiner reminder:\ndu machst das für den\nmenschen, der du in\n2 jahren sein willst.',
    () => 'motivation bringt dich\nins gym.\n\ndaten bringen dich\nzurück.',
    () => '3 monate konsequent\nsehen aus wie ein\nwunder.\n\nsind aber nur\n36 einträge.',
    () => 'jeder eintrag ist ein\nversprechen an dich\nselbst, das du gehalten\nhast.',
    () => 'du musst nicht heute\nstark sein.\n\ndu musst heute nur\nauftauchen und es\nnotieren.',
    () => 'der schwerste satz ist\nimmer der erste.\n\nder erste eintrag auch.\nmach ihn jetzt.',
    () => 'niemand wird stark aus\nversehen.\n\naber viele werden stark\ndurch langeweile:\ngleiche routine, jede\nwoche ein bisschen mehr.',
    () => 'dein potenzial interessiert\nkeinen.\n\ndein logbuch schon.',
    () => 'in 6 wochen kannst du\nentweder ergebnisse\nhaben oder ausreden.\n\nnicht beides.',
    () => 'du bist nur einen\neintrag von einer\nserie entfernt.\n\nund serien verändern\nleben.',
    () => 'der beste zeitpunkt\nanzufangen war vor\neinem jahr.\n\nder zweitbeste ist\nnach diesem video.',
    () => 'nicht jeder tag ist\nein pr.\n\naber jeder tag im log\nist ein tag, an dem\ndu nicht aufgegeben\nhast.',
    () => 'disziplin schlägt\nmotivation, aber\nüberblick schlägt\nbeides.',
    () => 'du glaubst, du hast\nkeine fortschritte\ngemacht?\n\nwart, bis du deine\nzahlen von vor 3\nmonaten siehst.',
    () => 'die leute, die du im\ngym bewunderst, führen\nfast alle heimlich buch.\n\nfrag sie mal.',
    () => 'heute keine lust?\nperfekt. genau diese\ntage trennen dich vom\nrest.',
    () => 'du kannst deinen kopf\nnicht immer überzeugen.\n\naber du kannst ihm\nzahlen zeigen, gegen\ndie er nicht argumentieren\nkann.',
    () => 'jeder will das ergebnis.\nfast keiner will den\nlangweiligen dienstag,\nan dem es entsteht.',
    () => 'gains sind nur\ngeduld plus buchhaltung.',
    () => 'du bereust nie das\nworkout, das du gemacht\nhast — nur die, die\ndu ausgelassen hast.',
    () => 'niemand rettet dich.\nkein coach, kein supp,\nkein trend.\n\nnur du, die stange und\nein bisschen konsequenz.',
    () => 'in einem jahr bist du\nsowieso ein jahr älter.\n\ndie frage ist nur, ob\nmit oder ohne fortschritt.',
    () => 'small win heute:\ngeh hin, heb was, schreib\nes auf.\n\nmorgen bist du der,\nder das durchzieht.',
  ],
  comparison: [
    () => 'zwei leute. gleiches gym.\ngleiche zeit.\n\neiner trackt. einer rät.\n\nin einem jahr reden wir.',
    () => 'training nach gefühl:\n„lief ganz gut“\n\ntraining mit daten:\n„+7,5 kg in 8 wochen“',
    () => 'zettel und kuli im gym?\n\n2010 will seinen\ntrainingsplan zurück.',
    i => i.title,
    () => 'typ A: „ich glaub, ich\nbin stärker geworden“\n\ntyp B: „+12 % kniebeuge\nin 8 wochen“\n\nsei typ B.',
    () => 'gleiche gym-zeit.\n\neiner baut muskeln.\neiner baut ausreden.',
    () => 'dein gedächtnis:\n5 workouts, verschwommen.\n\ndein log:\nalle. exakt. für immer.',
    () => 'influencer-transformation:\n12 wochen, gutes licht.\n\ndeine transformation:\nechte zahlen, echter\nbeweis.',
    () => 'motivation hält 2 wochen.\n\nein streak hält dich\nfür jahre.',
    () => 'anfänger: 5 supplements,\n0 notizen.\n\nfortgeschrittene: 0 hype,\njeder satz notiert.',
    () => 'die einen fragen „welcher\nsplit ist der beste?“\n\ndie anderen tracken den,\nden sie haben, und\nwachsen.',
    () => 'gym-bro nach gefühl:\n„heute war schwer“\n\ngym-bro mit log:\n„heute 3. woche in folge\ngesteigert“',
    () => 'du vor 6 monaten\nvs. du heute:\n\nkannst du den\nunterschied in zahlen\nsagen? der andere\ntyp kann.',
    () => 'training ohne log:\nim kreis laufen und\ndenken, man kommt voran.\n\ntraining mit log:\ntreppe.',
    () => 'zwei brüder, ein plan.\n\neiner schreibt alles auf.\neiner „hat’s im kopf“.\n\nrat mal, wer nach\neinem jahr vorn ist.',
    () => 'app mit feed:\ndu schaust anderen beim\ntrainieren zu.\n\napp ohne feed:\ndu trainierst.',
    () => 'das teure gym vs.\ndas billige gym ist egal.\n\nnachhalten vs. raten\nentscheidet.',
    () => '„ich mach das nach\ngefühl“ ist kein flex.\n\n„ich hab hier meine\nzahlen“ ist einer.',
    () => 'cardio-typ mit uhr,\ndie jeden schritt zählt.\n\nkraft-typ, der keine\neinzige wiederholung\nzählt.\n\nfindet den fehler.',
    () => 'plan im kopf:\nüberlebt bis zur ersten\nstressigen woche.\n\nplan in der app:\nüberlebt dich.',
    () => 'die einen posten den\nweg zum ziel.\n\ndie anderen dokumentieren\nihn — und kommen an.',
    () => 'gleiches essen. gleicher\nschlaf. gleiches gym.\n\nunterschied nach 12\nwochen? der eine wusste\nimmer, was zu schlagen\nwar.',
    () => 'du mit tracking bist\ndeinem stärksten gegner\nvoraus:\n\ndir ohne tracking.',
    () => 'raten kostet dich\nmonate.\n\ntracken kostet dich\n30 sekunden.',
    () => 'transformation mit\nfilter vs.\ntransformation mit\ntabelle.\n\neine kannst du beweisen.',
    () => 'zwei anfänger starten\nheute.\n\nin 6 monaten hat einer\neinen körper, der andere\neinen ordner voller\nfotos ohne kontext.',
    () => 'der eine sagt „fühlt\nsich stärker an“.\n\nder andere zeigt dir\ndie kurve. rate, wem\nman glaubt.',
    () => 'gym ohne daten ist wie\nnavi ohne standort:\n\ndu fährst, aber keiner\nweiß wohin.',
    () => 'du gegen den durchschnitt:\nder durchschnitt trackt\nnicht.\n\nsei nicht durchschnitt.',
  ],
  community: [
    () => 'sag mir deine lieblings-\nübung, ohne sie mir\nzu sagen.\n\nich fang an:\nbank frei, montag, 17 uhr.',
    () => 'unpopular gym opinion.\nlos, in die kommentare.\n\nich lese wirklich alles.',
    () => 'push pull legs oder\nganzkörper?\n\n(es gibt eine richtige\nantwort und ihr wisst es)',
    i => i.title.replace(/\?$/, '') + '?',
    () => 'kommentiere dein\naktuelles bankdrücken.\n\nkein judging.\n(okay, bisschen judging.)',
    () => 'unpopular-opinion-battle\nin den kommentaren.\n\nich starte: cardio VOR\ndem training ist völlig\nokay.',
    () => 'ppl, ganzkörper\noder bro-split?\n\nverteidige deine wahl\nin genau einem satz.',
    () => 'dein erster gedanke\nbeim wort „beintag“?\n\nehrliche antworten only.',
    () => 'tag jemanden, der\nnie sein warm-up macht.',
    () => 'was war euer letzter pr?\n\nich brauch fremde erfolge\nals motivation, ehrlich.',
    () => 'welche übung würdet ihr\nsofort aus jedem gym\nverbannen?\n\nich hol snacks und\nlese mit.',
    () => 'sei ehrlich:\nwie oft trainierst du\nwirklich pro woche?\n\nnicht wie oft du es\nvorhast.',
    () => 'was ist die dümmste\ngym-regel, an die du\nmal geglaubt hast?\n\nich hatte da einiges.',
    () => 'freie hantel oder\nmaschine — kommentare\nauf, kämpft.',
    () => 'welchen trainings-mythos\nhast du am längsten\ngeglaubt?\n\nich fang an: „muskel-\nkater = guter reiz“.',
    () => 'wie lange trainierst du\nschon?\n\nund würdest du sagen,\ndu kannst deinen\nfortschritt beweisen?',
    () => 'ein satz, den jeder im\ngym schon gedacht,\naber nie gesagt hat.\n\nich warte in den\nkommentaren.',
    () => 'lieblings- und\nhassübung.\n\nbeides in einem\nkommentar. los.',
    () => 'gym-partner suchen oder\nlieber allein?\n\nsag mir dein team\nin den kommentaren.',
    () => 'welches supplement war\nrausgeschmissenes geld?\n\nich fang an: fast alle.',
    () => 'was hält dich davon ab,\ndein training endlich\nnachzuhalten?\n\nehrliche antworten,\nkein urteil.',
    () => 'schätzt euch selbst ein:\nteam „hab’s im kopf“\noder team „schreib alles\nauf“?',
    () => 'welche übung hasst du,\nmachst sie aber, weil\nsie funktioniert?',
    () => 'gym-fail, den ihr nie\nvergesst?\n\nich brauch das heute.',
    () => 'wie viele von euch\nwissen GERADE, was ihr\nletztes training gehoben\nhabt?\n\nhonesty check in den\nkommentaren.',
    () => 'bester gym-tipp, den du\nje bekommen hast —\nin einem satz.',
    () => 'wer hat auch schon mal\nsein trainings-notizbuch\nverloren und wollte\nweinen?\n\nnur ich? okay.',
    () => 'ganz kurz:\nwas ist dein warum?\n\nwarum stehst du überhaupt\nvor der stange?',
    () => 'sag mir, in welcher stadt\ndu trainierst — vielleicht\nseid ihr im selben gym\nund wisst es nicht.',
    () => 'was war dein „ich bleib\ndabei“-moment im gym?\n\nteil ihn, jemand braucht\nihn heute.',
  ],
}

// Slide 2 = Payoff / Aufloesung / weicher CTA. Optional.
const PAYOFFS: Record<Category, string[]> = {
  education: [
    'tracken. vergleichen.\nsteigern.\n\nmehr ist es nicht.',
    'my gym track.\ndamit du es schwarz\nauf weiß hast.',
    'schreib EINEN satz auf.\nheute. mehr nicht.',
    'wissen + daten =\nunfairer vorteil.',
    'folg mir für teil 2.',
    'du musst es nicht\nauswendig können.\ndu musst es nur\naufschreiben.',
    'my gym track macht\naus „ich glaub“\nein „ich weiß“.',
    'speicher das für dein\nnächstes workout.',
    'die nerds hatten recht:\nzahlen schlagen gefühl.',
    'ausprobieren kostet\nnichts außer 30 sekunden.',
    'ein blick, und du weißt,\nwas heute zu schlagen ist.',
  ],
  problem: [
    'die lösung kostet dich\n30 sekunden pro workout.',
    'my gym track.\nschluss mit raten.',
    'du brauchst kein neues\nprogramm.\n\nnur sicht auf das alte.',
    'anfangen schlägt\noptimieren.\n\nheute erster eintrag.',
    'hör auf zu raten.\nfang an zu wissen.',
    'my gym track.\ndein letztes gewicht,\nimmer griffbereit.',
    'das problem ist nicht\ndein training.\nes ist dein gedächtnis.\nlös das.',
    'nie wieder „war das\n60 oder 62,5?“',
    'schreib heute den\nersten satz auf.\nden rest merkst du dir\nnie wieder.',
    'my gym track.\nkostenlos im app store.',
  ],
  feature: [
    'my gym track.\nteste es beim nächsten\nworkout.',
    'gebaut von jemandem,\nder selbst trainiert.\nman merkt es.',
    'my gym track.\nim app store.\nvon einem von euch.',
    'probier es ein workout\nlang. mehr verlang\nich nicht.',
    'kein abo, kein feed,\nkeine ads.\nversprochen.',
    'suchst du im app store:\nmy gym track.',
    'lade es, trag einen satz\nein, verstehe es sofort.',
    'made in germany,\nvon einem der\nselbst hebt.',
    'my gym track.\nendlich eine app, die\nnur eine sache will:\ndich stärker sehen.',
    'link in bio.\nkostenlos starten.',
  ],
  motivation: [
    'erster eintrag heute.\nder rest kommt\nvon allein.',
    'fortschritt, den du siehst,\nmacht süchtig.\nim guten sinne.',
    'streak starten.\nheute. jetzt.',
    'kleine schritte.\ngroßes log.',
    'my gym track.\nmach den ersten\neintrag zum ersten sieg.',
    'zukünftiges ich sagt\nschon mal danke.',
    'dein log wächst mit dir.\nfang heute an.',
    'nicht perfekt.\nnur angefangen.',
    'speicher das als\nerinnerung für morgen.',
    'ein satz reicht.\nmach ihn jetzt.',
  ],
  comparison: [
    'sei der, der trackt.',
    'my gym track.\nwähl die richtige seite.',
    'entscheide dich für die\nseite mit beweisen.',
    'tracking kostet 30 sekunden.\nraten kostet monate.',
    'welches team bist du?\nkommentare sind offen.',
    'in einem jahr willst du\nzu team beweis gehören.',
    'my gym track.\ndamit du auf der seite\nmit den zahlen stehst.',
    'der unterschied ist nicht\ntalent. es ist überblick.',
    'sei typ B.\nmy gym track.',
    'gleiche mühe, doppeltes\nergebnis. nur weil einer\nnachhält.',
  ],
  community: [
    'folg mir für mehr\ngym real talk.',
    'speichern und an deinen\ngym-partner schicken.',
    'bester kommentar\nwird gepinnt.',
    'wir lesen alles.\nwirklich alles.',
    'tag deinen trainings-\npartner drunter.',
    'antwort in die kommentare,\nich antworte allen.',
    'folg für teil 2 —\neure antworten\nentscheiden.',
    'schick das dem, der\nsein log verloren hat.',
    'my gym track, falls\ndu team „schreib alles\nauf“ bist.',
    'kommentiere, dann bau\nich daraus das nächste\nvideo.',
  ],
}

// Sound-Vibes passend zum Hook-Typ. Konkrete Titel wechseln taeglich ->
// Live-Auswahl ueber die Trend-Links unten.
const SOUNDS: { vibe: string; how: string }[] = [
  { vibe: 'Aggressiver Gym-Phonk / Hard Bass (140+ BPM)', how: 'Über „Trending Sounds (live)“ unten öffnen, Region Deutschland, letzte 7 Tage — einen steigenden Sound aus den Top 20 nehmen.' },
  { vibe: 'Cinematic Build-up (Piano → Bass Drop)', how: 'Bei 2 Slides: Slide-Wechsel auf den Drop legen. Sound live über die Trend-Links prüfen.' },
  { vibe: 'Ruhiger, viraler Lo-Fi-Beat', how: 'Passt zu Education-Slides. In der TikTok-Suche Sounds mit steigendem Pfeil (🔥) wählen.' },
  { vibe: 'Gesprochenes Trending-Audio (Meme/Voiceover)', how: 'Bei #gymtok schauen, welches Speech-Audio gerade läuft, und den Slide-Text darauf abstimmen.' },
]

const HOOK_TYPES: Record<Category, string> = {
  education: 'Curiosity / „Geheimwissen“',
  problem: 'Pain-Point / Selbsterkennung',
  feature: 'Indie-Story / Show-don\'t-tell',
  motivation: 'Emotion / Zukunfts-Ich',
  comparison: 'Kontrast / Vorher-Nachher',
  community: 'Frage / Comment-Bait',
}

// TikTok-Hashtags: wenige, Mix aus Reichweite + Nische. #fyp/#foryou immer dabei.
const BROAD = ['fyp', 'foryou', 'gymtok', 'fitnesstok', 'gym', 'fitness']
const NICHE_DE = ['fitnessdeutschland', 'gymdeutschland', 'krafttraining', 'muskelaufbau', 'fitnessmotivation']
const NICHE_TOPIC = ['workouttracking', 'progressiveoverload', 'gymtracker', 'fortschritt', 'trainingsplan']

function tiktokHashtags(): string[] {
  return ['mygymtrack', ...pick(BROAD, 3), ...pick(NICHE_DE, 1), ...pick(NICHE_TOPIC, 1)]
}

const POSTING_TIPS = [
  'Slide 1 ist auch dein Cover: muss als Standbild im Feed funktionieren.',
  'In der ersten Stunde jeden Kommentar beantworten — das entscheidet über den zweiten Push.',
  'Denselben Hook mit 2 verschiedenen Sounds testen; der Sound macht oft den Unterschied.',
  'Beste Posting-Zeiten für Gym-Content DE: 6–8 Uhr und 17–21 Uhr.',
]

// Umsetzungs-Playbook: baut auf den Mustern gerade viraler Foto-Posts auf
// (Photo-Mode + Trend-Sound + Comment-Bait + Reply-Videos).
const PLAN_BASE: string[] = [
  'TikTok → Foto-Modus: Slides in Reihenfolge hochladen, 3–4 Sekunden pro Slide.',
  'Sound zuerst: über „Trending Sounds (live)“ einen steigenden Sound wählen — er bringt mehr Reichweite als das Bild.',
  'Caption kurz + Frage ans Publikum, dazu die 4–6 Hashtags. Nicht mehr.',
  'Direkt nach dem Posten selbst den ersten Kommentar setzen (Frage oder Zusatz-Fact) — startet die Kommentarspalte.',
]

const PLAN_EXTRA: Record<Category, string> = {
  education: 'Läuft der Post: gleiche Struktur als „teil 2“ posten — Serien-Posts pushen sich gegenseitig.',
  problem: 'Auf die besten Kommentare mit Video-Replies antworten — jedes Reply ist ein neuer Post mit eingebautem Publikum.',
  feature: 'App-Screenshot als letzte Slide anhängen (unten wählbar) — erst Story, dann Produkt.',
  motivation: 'Gleichen Text zusätzlich als Story mit Countdown-Sticker posten — doppelte Reichweite, null Aufwand.',
  comparison: 'In den Kommentaren abstimmen lassen („team zettel oder team app?“) — Kontrast-Posts leben von der Debatte.',
  community: 'Beste Antworten screenshotten und als Follow-up-Slides posten — Community-Content erzeugt sich selbst.',
}

// Live-Trends: TikTok bietet keine offene API — diese Links oeffnen die echten
// Live-Rankings direkt (Creative Center ist oeffentlich, ohne Login einsehbar).
export const TREND_LINKS: { label: string; url: string; desc: string }[] = [
  {
    label: 'Trending Sounds (live)',
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en',
    desc: 'Offizielles TikTok-Ranking der Sounds. Oben Region „Germany“ + „Last 7 days“ einstellen.',
  },
  {
    label: 'Trending Hashtags (live)',
    url: 'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en',
    desc: 'Meistgenutzte Hashtags, filterbar nach Branche „Sports & Outdoor“.',
  },
  {
    label: '#gymtok jetzt ansehen',
    url: 'https://www.tiktok.com/tag/gymtok',
    desc: 'Was in der Nische gerade viral geht — Sounds und Formate der Top-Videos übernehmen.',
  },
  {
    label: 'Foto-Slides Inspiration',
    url: 'https://www.tiktok.com/search?q=gym%20tipps',
    desc: 'Aktuelle Foto-Posts der Konkurrenz: Hook-Stil und Slide-Anzahl vergleichen.',
  },
]

export function generateTikTok(idea: Idea): TikTokConcept {
  // Basis-Pools + die +100-Erweiterung pro Kategorie zusammenlegen.
  const hookPool = HOOKS[idea.cat].concat(HOOKS_EXTRA[idea.cat])
  const payoffPool = PAYOFFS[idea.cat].concat(PAYOFFS_EXTRA[idea.cat])
  const hook = rand(hookPool)(idea)
  // ~60 % zweislidig (Hook + Payoff), ~40 % einslidig (Hook + Sound tragen allein)
  const twoSlides = Math.random() < 0.6
  const slides: TikTokSlide[] = [{ text: hook, note: 'Hook — stoppt den Scroll. Großer, zentrierter Text.' }]
  if (twoSlides) {
    slides.push({ text: rand(payoffPool), note: 'Payoff — Auflösung + weicher CTA. Erst nach dem Hook zeigen.' })
  }
  const caption = `${idea.short} ${idea.title.includes('?') ? '' : 'Wie siehst du das?'}`.trim()
  return {
    ideaId: idea.id,
    category: idea.cat,
    hookType: HOOK_TYPES[idea.cat],
    slides,
    caption,
    hashtags: tiktokHashtags(),
    sound: rand(SOUNDS),
    postingTip: rand(POSTING_TIPS),
    plan: [...PLAN_BASE, PLAN_EXTRA[idea.cat]],
  }
}

export function tiktokAsText(t: TikTokConcept, title: string): string {
  return [
    'TIKTOK PHOTO-SLIDES: ' + title,
    'Hook-Typ: ' + t.hookType,
    '',
    ...t.slides.map((s, i) => `SLIDE ${i + 1}:\n"${s.text.replace(/\n/g, ' ')}"\n(${s.note})`),
    '',
    'SOUND: ' + t.sound.vibe,
    '→ ' + t.sound.how,
    '',
    'CAPTION:',
    t.caption,
    '',
    t.hashtags.map(h => '#' + h).join(' '),
    '',
    'SO SETZT DU ES UM:',
    ...t.plan.map((p, i) => `${i + 1}. ${p}`),
    '',
    'TIPP: ' + t.postingTip,
  ].join('\n')
}
