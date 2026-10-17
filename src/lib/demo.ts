// «Смотреть пример древа»: a read-only demo of the Tree with three famous families.
// The demo swaps the family document (S) for a ready-made one while it is open and puts the visitor's own back when it closes.
// Nothing here is ever saved: core.ts skips persist / commit / cloud sync while `demo.on` is true.
import { S, ui, bump, replaceData, finishOnboarding, closePanel, persist, demo, LANG, type Data, type Person, type Rel, type Gender } from './core'
import { PRESET_TYPES, presetType, type PresetType } from './avatars'

type Two = [string, string] // [ru, en]
/** one person: gender, name [ru first, ru last, en first, en last], birth and death (ДД.ММ.ГГГГ, MM.ГГГГ or ГГГГ; Westeros years as 0284), place keys */
interface DP {
  id: string; g: Gender; n: [string, string, string, string]
  b?: string; bp?: string; d?: string; dp?: string
  /** birth surname, when it is not the current one */
  was?: Two
  /** portrait type when age does not tell it (vampires look 17–23 for ever) */
  look?: PresetType
  /** children: only the year is shown, never a full date or a place */
  minor?: boolean
}
/** [type, a, b, year of marriage, flags, year it ended]: flags — 'step' (a stepparent), 'adopt' (an adoptive parent),
 *  'partner' (a couple that never married), 'ex' (divorced or split up), several separated by a space */
type DR = ['parent' | 'spouse' | 'sibling', string, string, string?, string?, string?]
export interface DemoFamily {
  k: string; tab: Two; title: Two
  /** the person every label is counted from, and the name after «для» («кто это для Алексея») */
  face: string; faceDat: Two; faceLabel: Two
  /** «год от Завоевания Эйегона»: Westeros years have no calendar of ours */
  era?: Two
  theme: string; frame?: { id: string; color: string }
  /** the age portraits are picked for, for people with no death date */
  now: number
  places: Record<string, Two>
  people: DP[]; rels: DR[]
  /** labels the kinship rules cannot know */
  kin?: Record<string, Two>
  /** demo only, never part of the app: two families who are not related but close («друг семьи»), a dotted arc above the cards */
  friends?: [string, string][]
}
/** a friendship link inside the demo document: it is not one of the app's link types, the Tree draws it only in the demo */
export const FRIEND = 'friend' as Rel['type']

// ---------------------------------------------------------------- the Targaryens and the great houses around them: from Daenerys
// «Песнь льда и пламени», «Пламя и кровь», «Повести о Дунке и Эгге» and both series. A marriage told in at least one of them counts.
// Westeros years count from Aegon's Conquest; births before it are left out.
/** a person in one line: 'Имя|Фамилия', 'First|Last', born, place, died, place */
const W = (id: string, g: Gender, ru: string, en: string, b?: string, bp?: string, d?: string, dp?: string, x?: Partial<DP>): DP => {
  const [rf, rl] = ru.split('|'), [ef, el] = en.split('|')
  return { id, g, n: [rf, rl || '', ef, el || ''], b, bp, d, dp, ...x }
}
const T_ = 'Таргариен|Targaryen'.split('|')
/** a Targaryen: the surname is added, unless the second line is the epithet they are known by («Эйегон I|Завоеватель») */
const tg = (id: string, g: Gender, ru: string, en: string, b?: string, bp?: string, d?: string, dp?: string, x?: Partial<DP>) =>
  W(id, g, ru.includes('|') ? ru : ru + '|' + T_[0], en.includes('|') ? en : en + '|' + T_[1], b, bp, d, dp, x)
/** both parents → each child */
const kids = (a: string, b: string | null, ...cs: string[]): DR[] => cs.flatMap(c => (b ? [['parent', a, c], ['parent', b, c]] : [['parent', a, c]]) as DR[])

const TARGARYEN: DemoFamily = {
  k: 'targaryen', tab: ['Игра престолов', 'Game of Thrones'], title: ['Таргариены и великие дома', 'House Targaryen and the great houses'],
  face: 'dany', faceDat: ['Дейенерис', 'Daenerys'], faceLabel: ['мать драконов', 'Mother of Dragons'],
  era: ['от Завоевания Эйегона', 'after Aegon’s Conquest'],
  theme: 'amber', frame: { id: 'baroque', color: 'gold' }, now: 300,
  places: {
    kl: ['Королевская Гавань', 'King’s Landing'], ds: ['Драконий Камень', 'Dragonstone'], sh: ['Летний Замок', 'Summerhall'],
    se: ['Штормовой Предел', 'Storm’s End'], ss: ['Солнечное Копьё', 'Sunspear'], wf: ['Винтерфелл', 'Winterfell'],
    tj: ['Башня Радости', 'Tower of Joy'], vd: ['Вейес Дотрак', 'Vaes Dothrak'], lh: ['Лхазар', 'Lhazar'], me: ['Миэрин', 'Meereen'],
    br: ['Браавос', 'Braavos'], tr: ['Трезубец', 'the Trident'], st: ['Ступени', 'the Stepstones'], sb: ['Залив Разбитых Кораблей', 'Shipbreaker Bay'],
    hh: ['Адов Холм', 'Hellholt'], ge: ['Божье Око', 'Gods Eye'], tar: ['Тарт', 'Tarth'], rr: ['Грачиный Приют', 'Rook’s Rest'], dm: ['Дрифтмарк', 'Driftmark'],
    pe: ['Пентос', 'Pentos'], sp: ['Пряный Город', 'Spicetown'], rst: ['Рунный Камень', 'Runestone'], tb: ['Тамблтон', 'Tumbleton'], gu: ['Глотка', 'the Gullet'],
    bb: ['Горький Мост', 'Bitterbridge'], ly: ['Лисс', 'Lys'], do: ['Дорн', 'Dorne'], rg: ['Багряное Поле', 'Redgrass Field'], ash: ['Эшфорд', 'Ashford'],
    cr: ['Утёс Кастерли', 'Casterly Rock'], ri: ['Риверран', 'Riverrun'], tw: ['Близнецы', 'the Twins'], ey: ['Орлиное Гнездо', 'the Eyrie'], hg: ['Хайгарден', 'Highgarden'],
    vo: ['Волантис', 'Volantis'],
  },
  people: [
    // Aegon the Conqueror's parents and the three who took Westeros
    W('aerion0', 'm', 'Эйерион|Таргариен', 'Aerion|Targaryen', undefined, 'ds', undefined, undefined, { look: 'oldm' }),
    W('valaena', 'f', 'Валейна|Веларион', 'Valaena|Velaryon', undefined, undefined, undefined, undefined, { look: 'oldw' }),
    tg('aegon1', 'm', 'Эйегон I|Завоеватель', 'Aegon I|the Conqueror', undefined, 'ds', '0037', 'ds', { look: 'oldm' }),
    tg('visenya', 'f', 'Висенья', 'Visenya', undefined, 'ds', '0044', 'ds', { look: 'oldw' }),
    tg('rhaenys0', 'f', 'Рейенис', 'Rhaenys', undefined, 'ds', '0010', 'hh', { look: 'woman' }),
    // their sons
    tg('aenys1', 'm', 'Эйенис I', 'Aenys I', '0007', undefined, '0042', 'ds'),
    W('alyssav', 'f', 'Алисса|Веларион', 'Alyssa|Velaryon', undefined, 'dm', undefined, undefined, { look: 'woman' }),
    tg('maegor', 'm', 'Мейегор I|Жестокий', 'Maegor I|the Cruel', '0012', undefined, '0048', 'kl'),
    W('rogar', 'm', 'Рогар|Баратеон', 'Rogar|Baratheon', undefined, 'se', undefined, undefined, { look: 'man' }),
    // Aenys' children
    tg('rhaena0', 'f', 'Рейена', 'Rhaena', '0023', undefined, undefined, undefined, { look: 'woman' }),
    tg('aegonU', 'm', 'Эйегон|Некоронованный', 'Aegon|the Uncrowned', '0026', undefined, '0043', 'ge'),
    tg('viserysA', 'm', 'Визерис', 'Viserys', '0029', undefined, '0044', 'kl'),
    tg('jaeh1', 'm', 'Джейехерис I|Примиритель', 'Jaehaerys I|the Conciliator', '0034', undefined, '0103', 'kl'),
    tg('alysanne', 'f', 'Алисанна', 'Alysanne', '0036', undefined, '0100', 'ds'),
    W('jocelyn', 'f', 'Джослин|Баратеон', 'Jocelyn|Baratheon', undefined, 'se', undefined, undefined, { look: 'woman' }),
    W('boremund', 'm', 'Боремунд|Баратеон', 'Boremund|Baratheon', undefined, 'se', '0129', undefined, { look: 'oldm' }),
    tg('aerea', 'f', 'Эйерея', 'Aerea', '0037', undefined, undefined, undefined, { look: 'girl' }),
    tg('rhaellaT', 'f', 'Рейелла', 'Rhaella', '0037', undefined, undefined, undefined, { look: 'woman' }),
    // the Old King's children
    tg('aemonJ', 'm', 'Эйемон', 'Aemon', '0052', undefined, '0092', 'tar'),
    tg('baelon', 'm', 'Бейелон|Храбрый', 'Baelon|the Brave', '0054', undefined, '0101', undefined),
    tg('alyssaJ', 'f', 'Алисса', 'Alyssa', '0057', undefined, '0084', undefined),
    tg('daella', 'f', 'Дейелла', 'Daella', '0062', undefined, '0082', undefined),
    W('rodrik', 'm', 'Родрик|Аррен', 'Rodrik|Arryn', undefined, 'ey', undefined, undefined, { look: 'man' }),
    W('borros', 'm', 'Боррос|Баратеон', 'Borros|Baratheon', undefined, 'se', undefined, undefined, { look: 'man' }),
    // the Dance of the Dragons: the elders
    tg('rhaenysQ', 'f', 'Рейенис|Королева, которой не было', 'Rhaenys|the Queen Who Never Was', '0074', undefined, '0129', 'rr'),
    W('corlys', 'm', 'Корлис|Веларион', 'Corlys|Velaryon', '0053', 'dm', '0132', undefined),
    tg('viserys1', 'm', 'Визерис I', 'Viserys I', '0077', undefined, '0129', 'kl'),
    W('aemma', 'f', 'Эймма|Аррен', 'Aemma|Arryn', '0082', undefined, '0105', 'kl'),
    W('alicent', 'f', 'Алисента|Хайтауэр', 'Alicent|Hightower', undefined, undefined, '0133', 'kl', { look: 'woman' }),
    tg('daemon', 'm', 'Деймон', 'Daemon', '0081', undefined, '0130', 'ge'),
    W('rhea', 'f', 'Рея|Ройс', 'Rhea|Royce', undefined, 'rst', '0115', 'rst', { look: 'woman' }),
    // the Dance: Blacks and Greens
    tg('rhaenyra', 'f', 'Рейенира', 'Rhaenyra', '0097', undefined, '0130', 'ds'),
    W('laenor', 'm', 'Лейнор|Веларион', 'Laenor|Velaryon', '0094', 'dm', '0120', 'sp'),
    W('laena', 'f', 'Лейна|Веларион', 'Laena|Velaryon', '0093', 'dm', '0120', 'pe'),
    tg('aegon2', 'm', 'Эйегон II', 'Aegon II', '0107', undefined, '0131', 'kl'),
    tg('helaena', 'f', 'Хелейна', 'Helaena', '0109', undefined, '0130', 'kl'),
    tg('aemond', 'm', 'Эймонд', 'Aemond', '0110', undefined, '0130', 'ge'),
    tg('daeronD', 'm', 'Дейерон|Отважный', 'Daeron|the Daring', '0114', undefined, '0130', 'tb'),
    W('jace', 'm', 'Джейкерис|Веларион', 'Jacaerys|Velaryon', '0114', undefined, '0130', 'gu'),
    W('luke', 'm', 'Люцерис|Веларион', 'Lucerys|Velaryon', '0115', undefined, '0129', 'se'),
    W('joffreyV', 'm', 'Джоффри|Веларион', 'Joffrey|Velaryon', '0117', undefined, '0130', 'kl'),
    tg('baela', 'f', 'Бейела', 'Baela', '0116', 'pe'),
    tg('rhaenaD', 'f', 'Рейена', 'Rhaena', '0116', 'pe'),
    tg('aegon3', 'm', 'Эйегон III|Драконья Погибель', 'Aegon III|the Dragonbane', '0120', undefined, '0157', 'kl'),
    tg('viserys2', 'm', 'Визерис II', 'Viserys II', '0122', undefined, '0172', 'kl'),
    tg('jaehJ', 'm', 'Джейехерис', 'Jaehaerys', '0123', undefined, '0129', 'kl'),
    tg('jaehaera', 'f', 'Джейехейра', 'Jaehaera', '0123', undefined, '0133', 'kl'),
    tg('maelor', 'm', 'Мейелор', 'Maelor', '0127', undefined, '0130', 'bb'),
    W('daenaera', 'f', 'Дейенера|Веларион', 'Daenaera|Velaryon', undefined, 'dm', undefined, undefined, { look: 'woman' }),
    W('larra', 'f', 'Ларра|Рогаре', 'Larra|Rogare', undefined, 'ly', undefined, undefined, { look: 'woman' }),
    // after the Dance
    tg('daeron1', 'm', 'Дейерон I|Юный Дракон', 'Daeron I|the Young Dragon', '0143', undefined, '0161', 'do'),
    tg('baelor1', 'm', 'Бейелор I|Благословенный', 'Baelor I|the Blessed', '0144', undefined, '0171', 'kl'),
    tg('daena', 'f', 'Дейна|Непокорная', 'Daena|the Defiant', '0145', undefined, undefined, undefined, { look: 'woman' }),
    tg('aegon4', 'm', 'Эйегон IV|Недостойный', 'Aegon IV|the Unworthy', '0135', undefined, '0184', 'kl'),
    tg('aemonK', 'm', 'Эйемон|Рыцарь-Дракон', 'Aemon|the Dragonknight', '0136', undefined, '0178', 'kl'),
    tg('naerys', 'f', 'Нейерис', 'Naerys', '0138', undefined, '0179', 'kl'),
    W('melissa', 'f', 'Мелисса|Блэквуд', 'Melissa|Blackwood', undefined, undefined, undefined, undefined, { look: 'woman' }),
    W('barba', 'f', 'Барба|Бракен', 'Barba|Bracken', undefined, undefined, undefined, undefined, { look: 'woman' }),
    // Aegon IV's sons: one by his queen, three of his Great Bastards
    tg('daeron2', 'm', 'Дейерон II|Добрый', 'Daeron II|the Good', '0153', undefined, '0209', 'kl'),
    W('myriah', 'f', 'Мирия|Мартелл', 'Myriah|Martell', undefined, 'ss', undefined, undefined, { look: 'woman' }),
    W('blackfyre', 'm', 'Деймон|Блэкфайр', 'Daemon|Blackfyre', '0170', undefined, '0196', 'rg'),
    W('bloodraven', 'm', 'Бринден Риверс|Кровавый Ворон', 'Brynden Rivers|Bloodraven', '0175', undefined, undefined, undefined, { look: 'oldm' }),
    W('bittersteel', 'm', 'Эйегор Риверс|Жгучий Клинок', 'Aegor Rivers|Bittersteel', '0172', undefined, undefined, undefined, { look: 'oldm' }),
    // Daeron the Good's sons
    tg('breakspear', 'm', 'Бейелор|Сломи Копьё', 'Baelor|Breakspear', '0170', undefined, '0209', 'ash'),
    tg('aerys1', 'm', 'Эйерис I', 'Aerys I', '0175', undefined, '0221', 'kl'),
    tg('maekar', 'm', 'Мейекар I', 'Maekar I', undefined, 'kl', '0233', undefined, { look: 'oldm' }),
    W('dyanna', 'f', 'Дианна|Дейн', 'Dyanna|Dayne', undefined, undefined, undefined, undefined, { look: 'woman' }),
    // Maekar's sons
    tg('aemon', 'm', 'Мейстер Эйемон', 'Maester Aemon', '0198', undefined, '0300', 'br', { look: 'oldm' }),
    tg('aerion', 'm', 'Эйерион|Ярый Огонь', 'Aerion|Brightflame', undefined, undefined, '0232', undefined, { look: 'man' }),
    tg('aegon5', 'm', 'Эйегон V|Невероятный', 'Aegon V|the Unlikely', '0200', 'kl', '0259', 'sh', { look: 'oldm' }),
    W('betha', 'f', 'Бета|Блэквуд', 'Betha|Blackwood', undefined, undefined, undefined, undefined, { look: 'oldw' }),
    // Egg's children
    tg('duncan', 'm', 'Дункан|Малый', 'Duncan|the Small', undefined, undefined, '0259', 'sh', { look: 'man' }),
    W('jenny', 'f', 'Дженни|из Старых Камней', 'Jenny|of Oldstones', undefined, undefined, undefined, undefined, { look: 'woman' }),
    tg('jaeh', 'm', 'Джейехерис II', 'Jaehaerys II', '0225', 'kl', '0262', 'kl', { look: 'man' }),
    tg('shaera', 'f', 'Шейра', 'Shaera', undefined, undefined, '0259', 'sh', { look: 'woman' }),
    tg('rhaelle', 'f', 'Рейель', 'Rhaelle', undefined, undefined, undefined, undefined, { look: 'woman' }),
    W('ormund', 'm', 'Ормунд|Баратеон', 'Ormund|Baratheon', undefined, undefined, '0260', 'st', { look: 'man' }),
    // the Mad King's generation and the great houses of the Rebellion
    tg('aerys', 'm', 'Эйерис II|Безумный', 'Aerys II|the Mad', '0244', 'kl', '0283', 'kl', { look: 'man' }),
    tg('rhaella', 'f', 'Рейла', 'Rhaella', '0245', 'kl', '0284', 'ds', { look: 'woman' }),
    W('steffon', 'm', 'Стеффон|Баратеон', 'Steffon|Baratheon', '0246', undefined, '0278', 'sb', { look: 'man' }),
    W('cassana', 'f', 'Кассана|Эстермонт', 'Cassana|Estermont', undefined, undefined, '0278', 'sb', { look: 'woman' }),
    W('tywin', 'm', 'Тайвин|Ланнистер', 'Tywin|Lannister', '0242', 'cr', '0300', 'kl', { look: 'oldm' }),
    W('joanna', 'f', 'Джоанна|Ланнистер', 'Joanna|Lannister', undefined, undefined, '0273', 'cr', { look: 'woman' }),
    W('rickard', 'm', 'Рикард|Старк', 'Rickard|Stark', undefined, 'wf', '0283', 'kl', { look: 'oldm' }),
    W('lyarra', 'f', 'Лиарра|Старк', 'Lyarra|Stark', undefined, undefined, undefined, undefined, { look: 'woman' }),
    W('hoster', 'm', 'Хостер|Талли', 'Hoster|Tully', undefined, 'ri', '0299', 'ri', { look: 'oldm' }),
    W('minisa', 'f', 'Миниса|Талли', 'Minisa|Tully', undefined, undefined, undefined, undefined, { was: ['Уэнт', 'Whent'], look: 'woman' }),
    // Daenerys and her brothers
    W('elia', 'f', 'Элия|Мартелл', 'Elia|Martell', '0257', 'ss', '0283', 'kl', { look: 'woman' }),
    tg('rhaegar', 'm', 'Рейегар', 'Rhaegar', '0259', 'sh', '0283', 'tr', { look: 'man' }),
    W('lyanna', 'f', 'Лианна|Старк', 'Lyanna|Stark', '0266', 'wf', '0283', 'tj', { look: 'woman' }),
    tg('viserys', 'm', 'Визерис', 'Viserys', '0276', 'kl', '0298', 'vd', { look: 'man' }),
    W('drogo', 'm', 'Кхал|Дрого', 'Khal|Drogo', undefined, undefined, '0298', 'lh', { look: 'man' }),
    tg('dany', 'f', 'Дейенерис', 'Daenerys', '0284', 'ds', undefined, undefined, { look: 'woman' }),
    W('hizdahr', 'm', 'Хиздар|зо Лорак', 'Hizdahr|zo Loraq', undefined, 'me', undefined, undefined, { look: 'man' }),
    W('daario', 'm', 'Даарио|Нахарис', 'Daario|Naharis', undefined, undefined, undefined, undefined, { look: 'man' }),
    // Baratheons and Lannisters
    W('robert', 'm', 'Роберт|Баратеон', 'Robert|Baratheon', '0262', 'se', '0298', 'kl', { look: 'man' }),
    W('cersei', 'f', 'Серсея|Ланнистер', 'Cersei|Lannister', '0266', 'cr', undefined, undefined, { look: 'woman' }),
    W('jaime', 'm', 'Джейме|Ланнистер', 'Jaime|Lannister', '0266', 'cr', undefined, undefined, { look: 'man' }),
    W('tyrion', 'm', 'Тирион|Ланнистер', 'Tyrion|Lannister', '0273', 'cr', undefined, undefined, { look: 'man' }),
    W('tysha', 'f', 'Тиша', 'Tysha', undefined, undefined, undefined, undefined, { look: 'woman' }),
    W('stannis', 'm', 'Станнис|Баратеон', 'Stannis|Baratheon', '0264', undefined, undefined, undefined, { look: 'man' }),
    W('selyse', 'f', 'Селиса|Флорент', 'Selyse|Florent', undefined, undefined, undefined, undefined, { look: 'woman' }),
    W('renly', 'm', 'Ренли|Баратеон', 'Renly|Baratheon', '0277', 'se', '0299', 'se', { look: 'man' }),
    W('margaery', 'f', 'Маргери|Тирелл', 'Margaery|Tyrell', '0283', 'hg', undefined, undefined, { look: 'woman' }),
    // Starks and Tullys
    W('brandon', 'm', 'Брандон|Старк', 'Brandon|Stark', '0262', 'wf', '0283', 'kl', { look: 'man' }),
    W('ned', 'm', 'Эддард|Старк', 'Eddard|Stark', '0263', 'wf', '0299', 'kl', { look: 'man' }),
    W('catelyn', 'f', 'Кейтилин|Старк', 'Catelyn|Stark', '0264', 'ri', '0299', 'tw', { was: ['Талли', 'Tully'], look: 'woman' }),
    W('benjen', 'm', 'Бенджен|Старк', 'Benjen|Stark', undefined, 'wf', undefined, undefined, { look: 'man' }),
    W('lysa', 'f', 'Лиза|Аррен', 'Lysa|Arryn', undefined, 'ri', '0300', 'ey', { was: ['Талли', 'Tully'], look: 'woman' }),
    W('jonarryn', 'm', 'Джон|Аррен', 'Jon|Arryn', undefined, 'ey', '0298', 'kl', { look: 'oldm' }),
    W('petyr', 'm', 'Петир|Бейлиш', 'Petyr|Baelish', undefined, undefined, undefined, undefined, { look: 'man' }),
    W('edmure', 'm', 'Эдмар|Талли', 'Edmure|Tully', undefined, 'ri', undefined, undefined, { look: 'man' }),
    W('roslin', 'f', 'Рослин|Фрей', 'Roslin|Frey', undefined, 'tw', undefined, undefined, { look: 'woman' }),
    // the youngest
    tg('rhaenys', 'f', 'Рейенис', 'Rhaenys', '0280', undefined, '0283', 'kl', { look: 'girl' }),
    tg('aegon', 'm', 'Эйегон', 'Aegon', '0281', undefined, '0283', 'kl', { look: 'boy' }),
    W('jon', 'm', 'Джон|Сноу', 'Jon|Snow', '0283', 'tj', undefined, undefined, { look: 'man' }),
    tg('rhaego', 'm', 'Рейего', 'Rhaego', '0298', undefined, '0298', 'lh', { look: 'boy' }),
    W('joffrey', 'm', 'Джоффри|Баратеон', 'Joffrey|Baratheon', '0286', 'kl', '0300', 'kl', { look: 'boy' }),
    W('myrcella', 'f', 'Мирцелла|Баратеон', 'Myrcella|Baratheon', '0290', 'kl', undefined, undefined, { look: 'girl' }),
    W('tommen', 'm', 'Томмен|Баратеон', 'Tommen|Baratheon', '0291', 'kl', undefined, undefined, { look: 'boy' }),
    W('gendry', 'm', 'Джендри', 'Gendry', '0284', 'kl', undefined, undefined, { look: 'boy' }),
    W('shireen', 'f', 'Ширен|Баратеон', 'Shireen|Baratheon', '0289', undefined, undefined, undefined, { look: 'girl' }),
    W('robb', 'm', 'Робб|Старк', 'Robb|Stark', '0283', 'ri', '0299', 'tw', { look: 'boy' }),
    W('jeyne', 'f', 'Джейн|Вестерлинг', 'Jeyne|Westerling', undefined, undefined, undefined, undefined, { look: 'girl' }),
    W('talisa', 'f', 'Талиса|Мейгир', 'Talisa|Maegyr', undefined, 'vo', '0299', 'tw', { look: 'woman' }),
    W('sansa', 'f', 'Санса|Старк', 'Sansa|Stark', '0286', 'wf', undefined, undefined, { look: 'girl' }),
    W('ramsay', 'm', 'Рамси|Болтон', 'Ramsay|Bolton', undefined, undefined, undefined, undefined, { look: 'man' }),
    W('arya', 'f', 'Арья|Старк', 'Arya|Stark', '0289', 'wf', undefined, undefined, { look: 'girl' }),
    W('bran', 'm', 'Бран|Старк', 'Bran|Stark', '0290', 'wf', undefined, undefined, { look: 'boy' }),
    W('rickon', 'm', 'Рикон|Старк', 'Rickon|Stark', '0295', 'wf', undefined, undefined, { look: 'boy' }),
    W('robin', 'm', 'Роберт|Аррен', 'Robert|Arryn', '0292', undefined, undefined, undefined, { look: 'boy' }),
  ],
  rels: [
    // the Conquest
    ['spouse', 'aerion0', 'valaena'], ...kids('aerion0', 'valaena', 'aegon1', 'visenya', 'rhaenys0'),
    ['spouse', 'aegon1', 'visenya'], ['spouse', 'aegon1', 'rhaenys0'],
    ...kids('aegon1', 'rhaenys0', 'aenys1'), ...kids('aegon1', 'visenya', 'maegor'),
    ['spouse', 'aenys1', 'alyssav'], ['spouse', 'alyssav', 'rogar'],
    ...kids('aenys1', 'alyssav', 'rhaena0', 'aegonU', 'viserysA', 'jaeh1', 'alysanne'), ...kids('rogar', 'alyssav', 'jocelyn', 'boremund'),
    ['spouse', 'rhaena0', 'aegonU'], ['spouse', 'rhaena0', 'maegor'], ...kids('aegonU', 'rhaena0', 'aerea', 'rhaellaT'),
    // Jaehaerys and Alysanne
    ['spouse', 'jaeh1', 'alysanne', '0049'], ...kids('jaeh1', 'alysanne', 'aemonJ', 'baelon', 'alyssaJ', 'daella'),
    ['spouse', 'aemonJ', 'jocelyn'], ['spouse', 'baelon', 'alyssaJ'], ['spouse', 'daella', 'rodrik'], ...kids('boremund', null, 'borros'),
    ...kids('aemonJ', 'jocelyn', 'rhaenysQ'), ...kids('baelon', 'alyssaJ', 'viserys1', 'daemon'), ...kids('rodrik', 'daella', 'aemma'),
    // the Dance of the Dragons
    ['spouse', 'rhaenysQ', 'corlys'], ...kids('corlys', 'rhaenysQ', 'laena', 'laenor'),
    ['spouse', 'viserys1', 'aemma'], ['spouse', 'viserys1', 'alicent', '0106'],
    ...kids('viserys1', 'aemma', 'rhaenyra'), ...kids('viserys1', 'alicent', 'aegon2', 'helaena', 'aemond', 'daeronD'),
    ['spouse', 'daemon', 'rhea'], ['spouse', 'daemon', 'laena'], ['spouse', 'daemon', 'rhaenyra', '0120'], ['spouse', 'rhaenyra', 'laenor', '0114'],
    ...kids('laenor', 'rhaenyra', 'jace', 'luke', 'joffreyV'), ...kids('daemon', 'laena', 'baela', 'rhaenaD'), ...kids('daemon', 'rhaenyra', 'aegon3', 'viserys2'),
    ['spouse', 'aegon2', 'helaena'], ...kids('aegon2', 'helaena', 'jaehJ', 'jaehaera', 'maelor'),
    ['spouse', 'aegon3', 'jaehaera', '0131'], ['spouse', 'aegon3', 'daenaera', '0133'], ...kids('aegon3', 'daenaera', 'daeron1', 'baelor1', 'daena'),
    ['spouse', 'viserys2', 'larra'], ...kids('viserys2', 'larra', 'aegon4', 'aemonK', 'naerys'),
    // Aegon the Unworthy: a queen and three mistresses
    ['spouse', 'aegon4', 'naerys'], ['spouse', 'aegon4', 'daena', '', 'partner'], ['spouse', 'aegon4', 'melissa', '', 'partner'], ['spouse', 'aegon4', 'barba', '', 'partner'],
    ...kids('aegon4', 'naerys', 'daeron2'), ...kids('aegon4', 'daena', 'blackfyre'), ...kids('aegon4', 'melissa', 'bloodraven'), ...kids('aegon4', 'barba', 'bittersteel'),
    ['spouse', 'daeron2', 'myriah'], ...kids('daeron2', 'myriah', 'breakspear', 'aerys1', 'maekar'),
    ['spouse', 'maekar', 'dyanna'], ...kids('maekar', 'dyanna', 'aemon', 'aerion', 'aegon5'),
    ['spouse', 'aegon5', 'betha', '0220'], ...kids('aegon5', 'betha', 'duncan', 'jaeh', 'shaera', 'rhaelle'),
    ['spouse', 'duncan', 'jenny', '0239'], ['spouse', 'jaeh', 'shaera', '0240'], ['spouse', 'rhaelle', 'ormund', '0245'],
    ...kids('jaeh', 'shaera', 'aerys', 'rhaella'), ['spouse', 'aerys', 'rhaella'],
    ...kids('ormund', 'rhaelle', 'steffon'), ['spouse', 'steffon', 'cassana'],
    ...kids('aerys', 'rhaella', 'rhaegar', 'viserys', 'dany'),
    ['spouse', 'rhaegar', 'elia', '0280'], ['spouse', 'rhaegar', 'lyanna'],
    ...kids('rhaegar', 'elia', 'rhaenys', 'aegon'), ...kids('rhaegar', 'lyanna', 'jon'),
    ['spouse', 'dany', 'drogo', '0298'], ['spouse', 'dany', 'hizdahr', '0300'], ['spouse', 'dany', 'daario', '', 'partner'], ...kids('dany', 'drogo', 'rhaego'),
    // Baratheons and Lannisters: Cersei's children are Jaime's; Robert raised them as their father
    ...kids('steffon', 'cassana', 'robert', 'stannis', 'renly'),
    ['spouse', 'tywin', 'joanna'], ...kids('tywin', 'joanna', 'cersei', 'jaime', 'tyrion'),
    ['spouse', 'robert', 'cersei', '0284'], ['spouse', 'cersei', 'jaime', '', 'partner'], ...kids('jaime', 'cersei', 'joffrey', 'myrcella', 'tommen'),
    ['parent', 'robert', 'joffrey', '', 'step'], ['parent', 'robert', 'myrcella', '', 'step'], ['parent', 'robert', 'tommen', '', 'step'], ...kids('robert', null, 'gendry'),
    ['spouse', 'stannis', 'selyse'], ...kids('stannis', 'selyse', 'shireen'),
    ['spouse', 'renly', 'margaery', '0299'], ['spouse', 'joffrey', 'margaery', '0300'], ['spouse', 'tommen', 'margaery', '0300'],
    ['spouse', 'tyrion', 'tysha', '', 'ex'], ['spouse', 'tyrion', 'sansa', '0299'],
    // Starks and Tullys; Ned raised Jon as his own son
    ['spouse', 'rickard', 'lyarra'], ...kids('rickard', 'lyarra', 'brandon', 'ned', 'lyanna', 'benjen'),
    ['spouse', 'hoster', 'minisa'], ...kids('hoster', 'minisa', 'catelyn', 'lysa', 'edmure'),
    ['spouse', 'ned', 'catelyn', '0283'], ...kids('ned', 'catelyn', 'robb', 'sansa', 'arya', 'bran', 'rickon'), ['parent', 'ned', 'jon', '', 'adopt'],
    ['spouse', 'lysa', 'jonarryn', '0282'], ['spouse', 'lysa', 'petyr', '0300'], ...kids('jonarryn', 'lysa', 'robin'),
    ['spouse', 'edmure', 'roslin', '0299'],
    ['spouse', 'robb', 'jeyne', '0299'], ['spouse', 'robb', 'talisa', '0299'], ['spouse', 'sansa', 'ramsay'],
  ],
}

// ---------------------------------------------------------------- the Kardashians and the Jenners: from Kim
// Children are shown with the birth year only.
const KARDASHIAN: DemoFamily = {
  k: 'kardashian', tab: ['Кардашьяны', 'Kardashians'], title: ['Кардашьяны и Дженнеры', 'Kardashian-Jenner'],
  face: 'kim', faceDat: ['Ким', 'Kim'], faceLabel: ['главная героиня', 'main character'],
  theme: 'rose', frame: { id: 'deco', color: 'black' }, now: 2026,
  places: {
    la: ['Лос-Анджелес', 'Los Angeles'], sd: ['Сан-Диего', 'San Diego'], mk: ['Маунт-Киско', 'Mount Kisco'], atl: ['Атланта', 'Atlanta'],
    ep: ['Истпорт', 'Eastport'], fo: ['Фонтана', 'Fontana'], ny: ['Нью-Йорк', 'New York'], to: ['Торонто', 'Toronto'],
    dc: ['Вашингтон', 'Washington, D.C.'], hou: ['Хьюстон', 'Houston'],
  },
  people: [
    { id: 'arthur', g: 'm', n: ['Артур', 'Кардашьян', 'Arthur', 'Kardashian'], look: 'oldm' },
    { id: 'helen', g: 'f', n: ['Хелен', 'Кардашьян', 'Helen', 'Kardashian'], was: ['Аракелян', 'Arakelian'], look: 'oldw' },
    { id: 'bob', g: 'm', n: ['Роберт', 'Хоутон', 'Robert', 'Houghton'], d: '1975', look: 'man' },
    { id: 'mj', g: 'f', n: ['Мэри Джо', 'Шеннон', 'Mary Jo', 'Shannon'], was: ['Кэмпбелл', 'Campbell'], b: '1934' },
    { id: 'robert', g: 'm', n: ['Роберт', 'Кардашьян', 'Robert', 'Kardashian'], b: '22.02.1944', bp: 'la', d: '30.09.2003', dp: 'la' },
    { id: 'kris', g: 'f', n: ['Крис', 'Дженнер', 'Kris', 'Jenner'], was: ['Хоутон', 'Houghton'], b: '05.11.1955', bp: 'sd' },
    { id: 'caitlyn', g: 'f', n: ['Кейтлин', 'Дженнер', 'Caitlyn', 'Jenner'], b: '28.10.1949', bp: 'mk' },
    { id: 'scott', g: 'm', n: ['Скотт', 'Дисик', 'Scott', 'Disick'], b: '26.05.1983', bp: 'ep' },
    { id: 'kourtney', g: 'f', n: ['Кортни', 'Кардашьян', 'Kourtney', 'Kardashian'], b: '18.04.1979', bp: 'la' },
    { id: 'travisb', g: 'm', n: ['Трэвис', 'Баркер', 'Travis', 'Barker'], b: '14.11.1975', bp: 'fo' },
    { id: 'kim', g: 'f', n: ['Ким', 'Кардашьян', 'Kim', 'Kardashian'], b: '21.10.1980', bp: 'la' },
    { id: 'kanye', g: 'm', n: ['Канье', 'Уэст', 'Kanye', 'West'], b: '08.06.1977', bp: 'atl' },
    { id: 'lamar', g: 'm', n: ['Ламар', 'Одом', 'Lamar', 'Odom'], b: '06.11.1979', bp: 'ny' },
    { id: 'khloe', g: 'f', n: ['Хлои', 'Кардашьян', 'Khloé', 'Kardashian'], b: '27.06.1984', bp: 'la' },
    { id: 'tristan', g: 'm', n: ['Тристан', 'Томпсон', 'Tristan', 'Thompson'], b: '13.03.1991', bp: 'to' },
    { id: 'rob', g: 'm', n: ['Роб', 'Кардашьян', 'Rob', 'Kardashian'], b: '17.03.1987', bp: 'la' },
    { id: 'chyna', g: 'f', n: ['Блэк', 'Чайна', 'Blac', 'Chyna'], b: '11.05.1988', bp: 'dc' },
    { id: 'kendall', g: 'f', n: ['Кендалл', 'Дженнер', 'Kendall', 'Jenner'], b: '03.11.1995', bp: 'la' },
    { id: 'kylie', g: 'f', n: ['Кайли', 'Дженнер', 'Kylie', 'Jenner'], b: '10.08.1997', bp: 'la' },
    { id: 'travis', g: 'm', n: ['Трэвис', 'Скотт', 'Travis', 'Scott'], b: '30.04.1991', bp: 'hou' },
    { id: 'mason', g: 'm', n: ['Мейсон', 'Дисик', 'Mason', 'Disick'], b: '2009', minor: true },
    { id: 'penelope', g: 'f', n: ['Пенелопа', 'Дисик', 'Penelope', 'Disick'], b: '2012', minor: true },
    { id: 'reign', g: 'm', n: ['Рейн', 'Дисик', 'Reign', 'Disick'], b: '2014', minor: true },
    { id: 'rocky', g: 'm', n: ['Рокки', 'Баркер', 'Rocky', 'Barker'], b: '2023', minor: true },
    { id: 'north', g: 'f', n: ['Норт', 'Уэст', 'North', 'West'], b: '2013', minor: true },
    { id: 'saint', g: 'm', n: ['Сейнт', 'Уэст', 'Saint', 'West'], b: '2015', minor: true },
    { id: 'chicago', g: 'f', n: ['Чикаго', 'Уэст', 'Chicago', 'West'], b: '2018', minor: true },
    { id: 'psalm', g: 'm', n: ['Псалм', 'Уэст', 'Psalm', 'West'], b: '2019', minor: true },
    { id: 'true', g: 'f', n: ['Тру', 'Томпсон', 'True', 'Thompson'], b: '2018', minor: true },
    { id: 'tatum', g: 'm', n: ['Тейтум', 'Томпсон', 'Tatum', 'Thompson'], b: '2022', minor: true },
    { id: 'dream', g: 'f', n: ['Дрим', 'Кардашьян', 'Dream', 'Kardashian'], b: '2016', minor: true },
    { id: 'stormi', g: 'f', n: ['Сторми', 'Вебстер', 'Stormi', 'Webster'], b: '2018', minor: true },
    { id: 'aire', g: 'm', n: ['Эйр', 'Вебстер', 'Aire', 'Webster'], b: '2022', minor: true },
  ],
  rels: [
    ['spouse', 'arthur', 'helen'], ['parent', 'arthur', 'robert'], ['parent', 'helen', 'robert'],
    ['spouse', 'bob', 'mj'], ['parent', 'bob', 'kris'], ['parent', 'mj', 'kris'],
    ['spouse', 'robert', 'kris', '08.07.1978', 'ex', '1991'], ['spouse', 'kris', 'caitlyn', '21.04.1991', 'ex', '2015'],
    ...(['kourtney', 'kim', 'khloe', 'rob'].flatMap(c => [['parent', 'robert', c], ['parent', 'kris', c]]) as DR[]),
    ...(['kendall', 'kylie'].flatMap(c => [['parent', 'caitlyn', c], ['parent', 'kris', c]]) as DR[]),
    ['spouse', 'kourtney', 'scott', '2006', 'partner ex', '2015'], ['spouse', 'kourtney', 'travisb', '15.05.2022'],
    ['spouse', 'kim', 'kanye', '24.05.2014', 'ex', '2022'],
    ['spouse', 'khloe', 'lamar', '27.09.2009', 'ex', '2016'], ['spouse', 'khloe', 'tristan', '2016', 'partner ex', '2021'],
    ['spouse', 'rob', 'chyna', '2016', 'partner ex', '2017'], ['spouse', 'kylie', 'travis', '2017', 'partner ex', '2023'],
    ...(['mason', 'penelope', 'reign'].flatMap(c => [['parent', 'kourtney', c], ['parent', 'scott', c]]) as DR[]),
    ['parent', 'kourtney', 'rocky'], ['parent', 'travisb', 'rocky'],
    ...(['north', 'saint', 'chicago', 'psalm'].flatMap(c => [['parent', 'kim', c], ['parent', 'kanye', c]]) as DR[]),
    ...(['true', 'tatum'].flatMap(c => [['parent', 'khloe', c], ['parent', 'tristan', c]]) as DR[]),
    ['parent', 'rob', 'dream'], ['parent', 'chyna', 'dream'],
    ...(['stormi', 'aire'].flatMap(c => [['parent', 'kylie', c], ['parent', 'travis', c]]) as DR[]),
  ],
  // Caitlyn was married to Kris as Bruce: «бывшая жена мамы» would read wrong
  kin: { caitlyn: ['бывшая супруга мамы', 'mom’s former spouse'] },
}

// ---------------------------------------------------------------- the Cullens («Twilight»): from Renesmee
// Carlisle and Esme adopted Edward, Alice, Jasper, Rosalie and Emmett: dotted lines, «приёмный» labels from the kinship rules.
const CULLEN: DemoFamily = {
  k: 'cullen', tab: ['Каллены', 'Cullens'], title: ['Каллены', 'The Cullens'],
  face: 'nessie', faceDat: ['Ренесми', 'Renesmee'], faceLabel: ['главная героиня', 'main character'],
  theme: 'steel', frame: { id: 'rococo', color: 'white' }, now: 2006,
  places: {
    lon: ['Лондон', 'London'], col: ['Колумбус', 'Columbus'], chi: ['Чикаго', 'Chicago'], bil: ['Билокси', 'Biloxi'], tx: ['Техас', 'Texas'],
    roc: ['Рочестер', 'Rochester'], gat: ['Гатлинбург', 'Gatlinburg'], fks: ['Форкс', 'Forks'], lp: ['Ла-Пуш', 'La Push'],
  },
  people: [
    { id: 'geoffrey', g: 'm', n: ['Джеффри', 'Свон', 'Geoffrey', 'Swan'], look: 'oldm' },
    { id: 'helen', g: 'f', n: ['Хелен', 'Свон', 'Helen', 'Swan'], look: 'oldw' },
    { id: 'carlisle', g: 'm', n: ['Карлайл', 'Каллен', 'Carlisle', 'Cullen'], b: '1640', bp: 'lon', look: 'man' },
    { id: 'esme', g: 'f', n: ['Эсми', 'Каллен', 'Esme', 'Cullen'], was: ['Платт', 'Platt'], b: '1895', bp: 'col', look: 'woman' },
    { id: 'masen', g: 'm', n: ['Эдвард', 'Мейсен', 'Edward', 'Masen'], d: '1918', dp: 'chi', look: 'man' },
    { id: 'elizabeth', g: 'f', n: ['Элизабет', 'Мейсен', 'Elizabeth', 'Masen'], d: '1918', dp: 'chi', look: 'woman' },
    { id: 'charlie', g: 'm', n: ['Чарли', 'Свон', 'Charlie', 'Swan'], bp: 'fks', look: 'man' },
    { id: 'renee', g: 'f', n: ['Рене', 'Дуайер', 'Renée', 'Dwyer'], was: ['Хиггинботэм', 'Higginbotham'], look: 'woman' },
    { id: 'phil', g: 'm', n: ['Фил', 'Дуайер', 'Phil', 'Dwyer'], look: 'man' },
    // the Blacks from La Push: Billy is Charlie's best friend
    { id: 'billy', g: 'm', n: ['Билли', 'Блэк', 'Billy', 'Black'], bp: 'lp', look: 'man' },
    { id: 'sarah', g: 'f', n: ['Сара', 'Блэк', 'Sarah', 'Black'], look: 'woman' },
    { id: 'rachel', g: 'f', n: ['Рейчел', 'Блэк', 'Rachel', 'Black'], bp: 'lp', look: 'woman' },
    { id: 'rebecca', g: 'f', n: ['Ребекка', 'Блэк', 'Rebecca', 'Black'], bp: 'lp', look: 'woman' },
    { id: 'jacob', g: 'm', n: ['Джейкоб', 'Блэк', 'Jacob', 'Black'], b: '14.01.1990', bp: 'lp', look: 'boy' },
    { id: 'edward', g: 'm', n: ['Эдвард', 'Каллен', 'Edward', 'Cullen'], was: ['Мейсен', 'Masen'], b: '20.06.1901', bp: 'chi', look: 'man' },
    { id: 'bella', g: 'f', n: ['Белла', 'Свон', 'Bella', 'Swan'], b: '13.09.1987', bp: 'fks', look: 'woman' },
    { id: 'alice', g: 'f', n: ['Элис', 'Каллен', 'Alice', 'Cullen'], was: ['Брэндон', 'Brandon'], b: '1901', bp: 'bil', look: 'woman' },
    { id: 'jasper', g: 'm', n: ['Джаспер', 'Хейл', 'Jasper', 'Hale'], was: ['Уитлок', 'Whitlock'], b: '1843', bp: 'tx', look: 'man' },
    { id: 'rosalie', g: 'f', n: ['Розали', 'Хейл', 'Rosalie', 'Hale'], b: '1915', bp: 'roc', look: 'woman' },
    { id: 'emmett', g: 'm', n: ['Эмметт', 'Каллен', 'Emmett', 'Cullen'], was: ['Маккарти', 'McCarty'], b: '1915', bp: 'gat', look: 'man' },
    { id: 'nessie', g: 'f', n: ['Ренесми', 'Каллен', 'Renesmee', 'Cullen'], b: '09.2006', bp: 'fks', look: 'girl' },
  ],
  rels: [
    ['spouse', 'geoffrey', 'helen'], ['parent', 'geoffrey', 'charlie'], ['parent', 'helen', 'charlie'],
    ['spouse', 'carlisle', 'esme'], ['spouse', 'masen', 'elizabeth'],
    ['spouse', 'charlie', 'renee', '', 'ex'], ['spouse', 'renee', 'phil'],
    ['parent', 'masen', 'edward'], ['parent', 'elizabeth', 'edward'], ['parent', 'charlie', 'bella'], ['parent', 'renee', 'bella'],
    ...(['edward', 'alice', 'jasper', 'rosalie', 'emmett'].flatMap(c => [['parent', 'carlisle', c, '', 'adopt'], ['parent', 'esme', c, '', 'adopt']]) as DR[]),
    ['spouse', 'alice', 'jasper'], ['spouse', 'rosalie', 'emmett'], ['spouse', 'edward', 'bella', '13.08.2006'],
    ['parent', 'edward', 'nessie'], ['parent', 'bella', 'nessie'],
    ['spouse', 'billy', 'sarah'], ...kids('billy', 'sarah', 'rachel', 'rebecca', 'jacob'),
  ],
  friends: [['charlie', 'billy']],
  kin: {
    billy: ['друг дедушки', 'grandpa’s friend'], sarah: ['жена друга дедушки', 'grandpa’s friend’s wife'],
    rachel: ['дочь друга дедушки', 'grandpa’s friend’s daughter'], rebecca: ['дочь друга дедушки', 'grandpa’s friend’s daughter'],
    jacob: ['сын друга дедушки', 'grandpa’s friend’s son'],
  },
}

// ---------------------------------------------------------------- the Romanovs: from Tsesarevich Alexei
// From Patriarch Filaret's family to the children of Nicholas II. Dates before 1918 in Russia are Old Style, as Russian sources give them;
// people born abroad keep the date of their own country.
const ROMANOV: DemoFamily = {
  k: 'romanov', tab: ['Романовы', 'Romanovs'], title: ['Романовы', 'The Romanovs'],
  face: 'alexeiN', faceDat: ['Алексея', 'Alexei'], faceLabel: ['цесаревич', 'tsesarevich'],
  theme: 'paper', frame: { id: 'empire', color: 'gold' }, now: 1918,
  places: {
    msk: ['Москва', 'Moscow'], spb: ['Санкт-Петербург', 'Saint Petersburg'], ts: ['Царское Село', 'Tsarskoye Selo'], ph: ['Петергоф', 'Peterhof'],
    kol: ['Коломенское', 'Kolomenskoye'], kiel: ['Киль', 'Kiel'], stet: ['Штеттин', 'Stettin'], rops: ['Ропша', 'Ropsha'], ros: ['Росток', 'Rostock'],
    kh: ['Холмогоры', 'Kholmogory'], shl: ['Шлиссельбург', 'Shlisselburg'], pav: ['Павловск', 'Pavlovsk'], karl: ['Карлсруэ', 'Karlsruhe'], bel: ['Белёв', 'Belyov'],
    tag: ['Таганрог', 'Taganrog'], vit: ['Витебск', 'Vitebsk'], ber: ['Берлин', 'Berlin'], darm: ['Дармштадт', 'Darmstadt'], nice: ['Ницца', 'Nice'],
    can: ['Канны', 'Cannes'], liv: ['Ливадия', 'Livadia'], cph: ['Копенгаген', 'Copenhagen'], hvi: ['Видёре', 'Hvidøre'], lon: ['Лондон', 'London'],
    osb: ['Осборн', 'Osborne'], win: ['Виндзор', 'Windsor'], alap: ['Алапаевск', 'Alapayevsk'], ekb: ['Екатеринбург', 'Yekaterinburg'], abas: ['Абастумани', 'Abastumani'],
    tif: ['Тифлис', 'Tiflis'], perm: ['Пермь', 'Perm'], tor: ['Торонто', 'Toronto'],
  },
  people: [
    W('filaret', 'm', 'Фёдор (Филарет)|Романов', 'Feodor (Filaret)|Romanov', undefined, undefined, '01.10.1633', 'msk', { look: 'oldm' }),
    W('kseniya', 'f', 'Ксения (Марфа)|Шестова', 'Xenia (Martha)|Shestova', undefined, undefined, '1631', 'msk', { look: 'oldw' }),
    W('mikhail', 'm', 'Михаил|Фёдорович', 'Michael|Feodorovich', '12.07.1596', 'msk', '13.07.1645', 'msk'),
    W('streshneva', 'f', 'Евдокия|Стрешнева', 'Eudoxia|Streshneva', '1608', undefined, '1645', 'msk'),
    W('alexeiM', 'm', 'Алексей|Тишайший', 'Alexei|the Quietest', '19.03.1629', 'msk', '29.01.1676', 'msk'),
    W('miloslavskaya', 'f', 'Мария|Милославская', 'Maria|Miloslavskaya', '1624', undefined, '1669', 'msk'),
    W('naryshkina', 'f', 'Наталья|Нарышкина', 'Natalya|Naryshkina', '1651', undefined, '1694', 'msk'),
    W('sofia', 'f', 'Софья|Алексеевна', 'Sophia|Alekseyevna', '17.09.1657', 'msk', '03.07.1704', 'msk'),
    W('fyodor3', 'm', 'Фёдор III|Алексеевич', 'Feodor III|Alexeyevich', '30.05.1661', 'msk', '27.04.1682', 'msk'),
    W('ivan5', 'm', 'Иван V|Алексеевич', 'Ivan V|Alexeyevich', '27.08.1666', 'msk', '29.01.1696', 'msk'),
    W('praskovya', 'f', 'Прасковья|Салтыкова', 'Praskovia|Saltykova', '1664', undefined, '1723', 'spb'),
    W('peter1', 'm', 'Пётр I|Великий', 'Peter I|the Great', '30.05.1672', 'msk', '28.01.1725', 'spb'),
    W('lopukhina', 'f', 'Евдокия|Лопухина', 'Eudoxia|Lopukhina', '1669', undefined, '1731', 'msk'),
    W('cath1', 'f', 'Екатерина I|Алексеевна', 'Catherine I|Alekseyevna', '05.04.1684', undefined, '06.05.1727', 'spb', { was: ['Марта Скавронская', 'Marta Skavronska'] }),
    W('ekatI', 'f', 'Екатерина|Иоанновна', 'Catherine|Ioannovna', '1691', 'msk', '1733', 'spb'),
    W('karlL', 'm', 'Карл Леопольд|Мекленбургский', 'Charles Leopold|of Mecklenburg', '1678', undefined, '1747'),
    W('annaI', 'f', 'Анна|Иоанновна', 'Anna|Ioannovna', '28.01.1693', 'msk', '17.10.1740', 'spb'),
    W('fwk', 'm', 'Фридрих Вильгельм|Курляндский', 'Frederick William|of Courland', '1692', undefined, '1711'),
    W('alexeiP', 'm', 'Алексей|Петрович', 'Alexei|Petrovich', '18.02.1690', 'msk', '26.06.1718', 'spb'),
    W('charlotte', 'f', 'Шарлотта|Брауншвейгская', 'Charlotte|of Brunswick', '1694', undefined, '1715', 'spb'),
    W('annaP', 'f', 'Анна|Петровна', 'Anna|Petrovna', '27.01.1708', 'msk', '04.03.1728', 'kiel'),
    W('karlF', 'm', 'Карл Фридрих|Гольштейн-Готторпский', 'Charles Frederick|of Holstein-Gottorp', '1700', undefined, '1739'),
    W('elizabeth', 'f', 'Елизавета|Петровна', 'Elizabeth|Petrovna', '18.12.1709', 'kol', '25.12.1761', 'spb'),
    W('annaL', 'f', 'Анна|Леопольдовна', 'Anna|Leopoldovna', '1718', 'ros', '1746', 'kh'),
    W('anton', 'm', 'Антон Ульрих|Брауншвейгский', 'Anthony Ulrich|of Brunswick', '1714', undefined, '1774', 'kh'),
    W('peter2', 'm', 'Пётр II|Алексеевич', 'Peter II|Alexeyevich', '12.10.1715', 'spb', '19.01.1730', 'msk'),
    W('peter3', 'm', 'Пётр III|Фёдорович', 'Peter III|Feodorovich', '10.02.1728', 'kiel', '06.07.1762', 'rops'),
    W('cath2', 'f', 'Екатерина II|Великая', 'Catherine II|the Great', '21.04.1729', 'stet', '06.11.1796', 'spb', { was: ['Софья Ангальт-Цербстская', 'Sophie of Anhalt-Zerbst'] }),
    W('orlov', 'm', 'Григорий|Орлов', 'Grigory|Orlov', '1734', undefined, '1783', 'msk'),
    W('ivan6', 'm', 'Иван VI|Антонович', 'Ivan VI|Antonovich', '12.08.1740', 'spb', '05.07.1764', 'shl'),
    W('paul1', 'm', 'Павел I|Петрович', 'Paul I|Petrovich', '20.09.1754', 'spb', '11.03.1801', 'spb'),
    W('mariaF1', 'f', 'Мария|Фёдоровна', 'Maria|Feodorovna', '1759', 'stet', '1828', 'pav', { was: ['София Доротея Вюртембергская', 'Sophie Dorothea of Württemberg'] }),
    W('bobrinsky', 'm', 'Алексей|Бобринский', 'Alexei|Bobrinsky', '11.04.1762', 'spb', '1813'),
    W('alex1', 'm', 'Александр I|Благословенный', 'Alexander I|the Blessed', '12.12.1777', 'spb', '19.11.1825', 'tag'),
    W('elizA', 'f', 'Елизавета|Алексеевна', 'Elizabeth|Alexeievna', '1779', 'karl', '1826', 'bel', { was: ['Луиза Баденская', 'Louise of Baden'] }),
    W('konst', 'm', 'Константин|Павлович', 'Konstantin|Pavlovich', '27.04.1779', 'ts', '15.06.1831', 'vit'),
    W('annaF', 'f', 'Анна|Фёдоровна', 'Anna|Feodorovna', '1781', undefined, '1860', undefined, { was: ['Юлиана Саксен-Кобургская', 'Juliane of Saxe-Coburg'] }),
    W('grudz', 'f', 'Жанетта|Грудзинская', 'Joanna|Grudzińska', undefined, undefined, '1831', 'ts', { look: 'woman' }),
    W('nick1', 'm', 'Николай I|Павлович', 'Nicholas I|Pavlovich', '25.06.1796', 'ts', '18.02.1855', 'spb'),
    W('alexF1', 'f', 'Александра|Фёдоровна', 'Alexandra|Feodorovna', '1798', 'ber', '1860', 'ts', { was: ['Шарлотта Прусская', 'Charlotte of Prussia'] }),
    W('victoria', 'f', 'Виктория|Британская', 'Victoria|of the United Kingdom', '24.05.1819', 'lon', '22.01.1901', 'osb'),
    W('albert', 'm', 'Альберт|Саксен-Кобург-Готский', 'Albert|of Saxe-Coburg and Gotha', '1819', undefined, '1861', 'win'),
    W('alex2', 'm', 'Александр II|Освободитель', 'Alexander II|the Liberator', '17.04.1818', 'msk', '01.03.1881', 'spb'),
    W('mariaA', 'f', 'Мария|Александровна', 'Maria|Alexandrovna', '1824', 'darm', '1880', 'spb', { was: ['Мария Гессенская', 'Marie of Hesse'] }),
    W('dolgorukova', 'f', 'Екатерина|Юрьевская', 'Catherine|Yurievskaya', '1847', 'msk', '1922', 'nice', { was: ['Долгорукова', 'Dolgorukova'] }),
    W('mikhailN', 'm', 'Михаил|Николаевич', 'Michael|Nikolaevich', '1832', undefined, '1909', 'can'),
    W('alice', 'f', 'Алиса|Гессенская', 'Alice|of Hesse', '1843', 'lon', '1878', 'darm', { was: ['Алиса Великобританская', 'Alice of the United Kingdom'] }),
    W('ludwig', 'm', 'Людвиг IV|Гессенский', 'Louis IV|of Hesse', '1837', undefined, '1892', 'darm'),
    W('alex3', 'm', 'Александр III|Миротворец', 'Alexander III|the Peacemaker', '26.02.1845', 'spb', '20.10.1894', 'liv'),
    W('dagmar', 'f', 'Мария|Фёдоровна', 'Maria|Feodorovna', '1847', 'cph', '1928', 'hvi', { was: ['Дагмар Датская', 'Dagmar of Denmark'] }),
    W('sergei', 'm', 'Сергей|Александрович', 'Sergei|Alexandrovich', '29.04.1857', 'ts', '04.02.1905', 'msk'),
    W('georgyY', 'm', 'Георгий|Юрьевский', 'George|Yurievsky', '1872', 'spb', '1913'),
    W('sandro', 'm', 'Александр|Михайлович', 'Alexander|Mikhailovich', '1866', 'tif', '1933'),
    W('ella', 'f', 'Елизавета|Фёдоровна', 'Elizabeth|Feodorovna', '1864', 'darm', '1918', 'alap', { was: ['Элла Гессенская', 'Elisabeth of Hesse'] }),
    W('nick2', 'm', 'Николай II|Александрович', 'Nicholas II|Alexandrovich', '06.05.1868', 'ts', '17.07.1918', 'ekb'),
    W('alix', 'f', 'Александра|Фёдоровна', 'Alexandra|Feodorovna', '06.06.1872', 'darm', '17.07.1918', 'ekb', { was: ['Алиса Гессенская', 'Alix of Hesse'] }),
    W('georgyA', 'm', 'Георгий|Александрович', 'George|Alexandrovich', '27.04.1871', 'ts', '28.06.1899', 'abas'),
    W('xenia', 'f', 'Ксения|Александровна', 'Xenia|Alexandrovna', '25.03.1875', 'spb', '20.04.1960', 'lon'),
    W('mikhailA', 'm', 'Михаил|Александрович', 'Michael|Alexandrovich', '22.11.1878', 'spb', '13.06.1918', 'perm'),
    W('brasova', 'f', 'Наталья|Брасова', 'Natalia|Brasova', '1880', undefined, '1952'),
    W('olgaA', 'f', 'Ольга|Александровна', 'Olga|Alexandrovna', '01.06.1882', 'ph', '24.11.1960', 'tor'),
    W('oldenburg', 'm', 'Пётр|Ольденбургский', 'Peter|of Oldenburg', '1868', undefined, '1924'),
    W('kulikovsky', 'm', 'Николай|Куликовский', 'Nikolai|Kulikovsky', undefined, undefined, '1958', undefined, { look: 'oldm' }),
    W('brasov', 'm', 'Георгий|Брасов', 'George|Brasov', '1910', undefined, '1931'),
    W('olgaN', 'f', 'Ольга|Николаевна', 'Olga|Nikolaevna', '03.11.1895', 'ts', '17.07.1918', 'ekb'),
    W('tatiana', 'f', 'Татьяна|Николаевна', 'Tatiana|Nikolaevna', '29.05.1897', 'ph', '17.07.1918', 'ekb'),
    W('mariaN', 'f', 'Мария|Николаевна', 'Maria|Nikolaevna', '14.06.1899', 'ph', '17.07.1918', 'ekb'),
    W('anastasia', 'f', 'Анастасия|Николаевна', 'Anastasia|Nikolaevna', '05.06.1901', 'ph', '17.07.1918', 'ekb'),
    W('alexeiN', 'm', 'Алексей|Николаевич', 'Alexei|Nikolaevich', '30.07.1904', 'ph', '17.07.1918', 'ekb'),
  ],
  rels: [
    ['spouse', 'filaret', 'kseniya'], ...kids('filaret', 'kseniya', 'mikhail'),
    ['spouse', 'mikhail', 'streshneva', '1626'], ...kids('mikhail', 'streshneva', 'alexeiM'),
    ['spouse', 'alexeiM', 'miloslavskaya', '1648'], ['spouse', 'alexeiM', 'naryshkina', '1671'],
    ...kids('alexeiM', 'miloslavskaya', 'sofia', 'fyodor3', 'ivan5'), ...kids('alexeiM', 'naryshkina', 'peter1'),
    ['spouse', 'ivan5', 'praskovya', '1684'], ...kids('ivan5', 'praskovya', 'ekatI', 'annaI'),
    // Peter sent his first wife to a convent in 1698
    ['spouse', 'peter1', 'lopukhina', '1689', 'ex', '1698'], ['spouse', 'peter1', 'cath1', '1712'],
    ...kids('peter1', 'lopukhina', 'alexeiP'), ...kids('peter1', 'cath1', 'annaP', 'elizabeth'),
    ['spouse', 'ekatI', 'karlL', '1716'], ...kids('karlL', 'ekatI', 'annaL'), ['spouse', 'annaI', 'fwk', '1710'],
    ['spouse', 'alexeiP', 'charlotte', '1711'], ...kids('alexeiP', 'charlotte', 'peter2'),
    ['spouse', 'annaP', 'karlF', '1725'], ...kids('karlF', 'annaP', 'peter3'),
    ['spouse', 'annaL', 'anton', '1739'], ...kids('anton', 'annaL', 'ivan6'),
    ['spouse', 'peter3', 'cath2', '1745'], ...kids('peter3', 'cath2', 'paul1'),
    ['spouse', 'cath2', 'orlov', '', 'partner'], ...kids('orlov', 'cath2', 'bobrinsky'),
    ['spouse', 'paul1', 'mariaF1', '1776'], ...kids('paul1', 'mariaF1', 'alex1', 'konst', 'nick1'),
    ['spouse', 'alex1', 'elizA', '1793'],
    ['spouse', 'konst', 'annaF', '1796', 'ex', '1820'], ['spouse', 'konst', 'grudz', '1820'],
    ['spouse', 'nick1', 'alexF1', '1817'], ...kids('nick1', 'alexF1', 'alex2', 'mikhailN'),
    ['spouse', 'alex2', 'mariaA', '1841'], ['spouse', 'alex2', 'dolgorukova', '1880'],
    ...kids('alex2', 'mariaA', 'alex3', 'sergei'), ...kids('alex2', 'dolgorukova', 'georgyY'), ...kids('mikhailN', null, 'sandro'),
    ['spouse', 'victoria', 'albert', '1840'], ...kids('albert', 'victoria', 'alice'),
    ['spouse', 'alice', 'ludwig', '1862'], ...kids('ludwig', 'alice', 'ella', 'alix'),
    ['spouse', 'alex3', 'dagmar', '1866'], ...kids('alex3', 'dagmar', 'nick2', 'georgyA', 'xenia', 'mikhailA', 'olgaA'),
    ['spouse', 'sergei', 'ella', '1884'], ['spouse', 'xenia', 'sandro', '1894'],
    ['spouse', 'mikhailA', 'brasova', '1912'], ...kids('mikhailA', 'brasova', 'brasov'),
    ['spouse', 'olgaA', 'oldenburg', '1901', 'ex', '1916'], ['spouse', 'olgaA', 'kulikovsky', '1916'],
    ['spouse', 'nick2', 'alix', '14.11.1894'], ...kids('nick2', 'alix', 'olgaN', 'tatiana', 'mariaN', 'anastasia', 'alexeiN'),
  ],
}

// the order of the tabs; the first one opens with the demo (the Cullens are small enough to grow smoothly on any phone)
export const FAMILIES: DemoFamily[] = [CULLEN, KARDASHIAN, TARGARYEN, ROMANOV]
export const famOf = (k?: string) => FAMILIES.find(f => f.k === k) || FAMILIES[0]
export const tr = (x?: Two) => (x ? (LANG === 'en' ? x[1] : x[0]) : '')

// ---------------------------------------------------------------- building the family document
/** a stable pseudo-random sequence, so the portraits are the same on every visit */
function seeded(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296 } }

export function buildFamily(f: DemoFamily): Data {
  const en = LANG === 'en', place = (k?: string) => (k ? (en ? f.places[k][1] : f.places[k][0]) : '')
  const people: Person[] = f.people.map(x => ({
    id: x.id, first: en ? x.n[2] : x.n[0], last: en ? x.n[3] : x.n[1], maiden: x.was ? (en ? x.was[1] : x.was[0]) : '', patronymic: '', gender: x.g,
    birthDate: x.b || '', birthPlace: x.minor ? '' : place(x.bp), deathDate: x.d || '', deathPlace: place(x.dp),
    job: '', edu: '', bio: '', avatar: '', media: [], events: [],
  }))
  const rels: Rel[] = f.rels.map(([type, a, b, from, flags, to], i) => {
    const r: Rel = { id: 'r' + i, type, a, b, from: from || '' }, fl = (flags || '').split(' ')
    if (fl.includes('step')) r.step = true; if (fl.includes('adopt')) r.adopt = true; if (fl.includes('partner')) r.partner = true
    if (fl.includes('ex')) { r.ex = true; if (to) r.to = to }
    return r
  })
  ;(f.friends || []).forEach(([a, b], i) => rels.push({ id: 'f' + i, type: FRIEND, a, b, from: '' }))
  // portraits: by the age they had (at death, or in the family's «now»), different from the people right next to them
  const rnd = seeded(f.k), near = (id: string) => rels.filter(r => r.a === id || r.b === id).map(r => (r.a === id ? r.b : r.a))
  const byId = (id: string) => people.find(p => p.id === id)!
  f.people.forEach(x => {
    const p = byId(x.id)
    const type = x.look || presetType({ gender: x.g, birthDate: x.b, deathDate: x.d || String(f.now) })
    const taken = new Set(near(x.id).map(id => byId(id).preset || '')), list = PRESET_TYPES[type], free = list.filter(v => !taken.has(v))
    const pool = free.length ? free : list; p.preset = pool[Math.floor(rnd() * pool.length)]
  })
  if (f.frame) byId(f.face).frame = f.frame
  return { people, rels, pets: [], achievements: [], settings: { familyName: tr(f.title), theme: f.theme, ghosts: false, lines: 'smooth', kin: true, meId: f.face } }
}

/** person id → how they are related to the face, for what the rules cannot work out */
export function kinOverrides(f: DemoFamily) {
  const out: Record<string, string> = { [f.face]: tr(f.faceLabel) }
  Object.entries(f.kin || {}).forEach(([id, v]) => { out[id] = tr(v) })
  return out
}

/** «How many steps» from the face to everyone, through any link: the order in which the tree grows on first open */
export function distances(faceId: string) {
  const d: Record<string, number> = { [faceId]: 0 }, q = [faceId]
  while (q.length) { const x = q.shift()!; S.rels.forEach(r => { const o = r.a === x ? r.b : r.b === x ? r.a : null; if (o && d[o] == null) { d[o] = d[x] + 1; q.push(o) } }) }
  return d
}

// ---------------------------------------------------------------- open / switch / close
let saved: Data | null = null
const hashFor = (k: string) => '#demo=' + k
function setHash(h: string) { try { history.replaceState(null, '', location.pathname + location.search + h) } catch { /* sandboxed */ } }
/** the demo can be opened by a link: …/#demo or …/#demo=kardashian */
export function demoFromHash() { const m = location.hash.match(/^#demo(?:=([a-z]+))?$/); return m ? famOf(m[1]).k : null }

function load(k: string) {
  replaceData(buildFamily(famOf(k)))
  ui.panel = null; ui.treeRefit++
  setHash(hashFor(k))
}
export function openDemo(k?: string) {
  if (!demo.on) { saved = S; demo.on = true }
  const fam = famOf(k).k
  // the tree grows from the face only the first time the page opens, not when the family is switched
  ui.demo = { fam, intro: Date.now() }
  closePanel(); load(fam); bump()
}
export function switchDemo(k: string) {
  if (!ui.demo || ui.demo.fam === k) return
  ui.demo = { fam: k, intro: 0 }; load(k); bump()
}
/** leave the demo: back to the landing, or (start) straight into building one's own tree */
export function closeDemo(start = false) {
  if (!demo.on) return
  if (saved) replaceData(saved); saved = null; demo.on = false
  persist() // a save asked for just before the demo opened was skipped while it was on
  ui.demo = null; ui.panel = null; ui.treeRefit++; ui.mapRefit++
  setHash('')
  if (start) finishOnboarding(S.people.length ? null : 'blank')
  else { demo.backToEnd = true; if (!S.settings.onboarded) ui.onboarding = true }
  bump()
}
