import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

export const fourteenSongs = [
  // -------------------------------------------------------------
  // AGAKIZA (3 Songs)
  // -------------------------------------------------------------
  {
    id: 'song_14_agakiza_01',
    category_id: 'cat_agakiza',
    category_name: 'AGAKIZA',
    category_slug: 'agakiza',
    category_number: 1,
    song_number: '1',
    title: 'NGWINO TUJYANE',
    lyrics: `1.      Ngwino tujyane iwacu aho
Imana yateguriye abera Aho bazaba iteka ryose ngwino nshuti reka gutinda. 

          GUT: Kondi
umunyabyaha ntakwiriye kwinjira aho hera H’Imana ikomeye ndatinye sinayigera
imbere nakoze Ibyaha byinshi ntiyanyemerera. 

         KWIK: Reka
gutinya mwene data imbabazi z’Imana zihoraho Ntabwo ibyaha byawe byatukura tuku
tuku Yesu ni umunyembabazi. 

2.      Mwene data umvira iryo jwi
riguhamagara ngo ugaruke ubabarirwe Umere nka wamwana w’ikirara wagarutse kwa
se aramwakira. 

            GUT: Data
nari narazimiye narajarajaye mubyaha mbura amahoro Singikwiriye kwitwa umwana
wawe data umbabarire ungire umwe Mubakozi bawe uu! data ndagarutse ungire umwe
mubakozi bawe. 

             KWIK:
Ngwino mwana w’Imana ubabarirwe ibyaha byawe byose So wo mu ijuru arakwakira
vuba nshuti garuka murugo. 

R/Ngwino reka gutinya nshuti Yesu ni Umunyebambe`
  },
  {
    id: 'song_14_agakiza_02',
    category_id: 'cat_agakiza',
    category_name: 'AGAKIZA',
    category_slug: 'agakiza',
    category_number: 1,
    song_number: '2',
    title: 'DORE URUKUNDO',
    lyrics: `1.      Dore urukundo rutangaje,
Imana data yadukunze. Rwatumye itanga umwana wayo w’ikinege Kugirango umwizera
wese ntazarimbuke Ahubwo azahabwe ubugingo buhoraho. 

R/Uwo
yatubereye igitambo ibindi byose bikurwaho Yamennye amaraso y’igiciro kubwacu
Icumu yatewe murubavu, inkoni yakubiswe kubwacu (Ibyo nibyo yadukirishije)*

2.      Umuntu amaze gucumura ibye
byari birangiye Icyari gikurikiyeho rwari urupfu Kubw’imbabazi z’Imana itanga
umwana wayo Yesu Ngo abe ariwe upfa mucyimbo cyacu nashimirwe.

 R/2.Amaraso y’umwami Yesu niyo yabaye
ikimenyetso Kiduhuza n’Imana data.`
  },
  {
    id: 'song_14_agakiza_03',
    category_id: 'cat_agakiza',
    category_name: 'AGAKIZA',
    category_slug: 'agakiza',
    category_number: 1,
    song_number: '3',
    title: 'YESU YESU MWAMI',
    lyrics: `1.
Yesu Yesu mwami Yesu Yesu mukiza urukundo rwawe wadukunze Mwami wanjye
rurahebuje ibyo wankoreye nibyinshi ibyo wankoreye Bisumbye uko mbivuga. 

R/Wadukuye
mu ivata ry’ibyaha ry’ibyaha utwigiza hafi y’amasezerano Kera ntitwari ubwoko
mwami ariko ubu twigijwe hafi Mana turagushimye.

 2. Ni iki gihesha ubugingo buhoraho ni
ukumenya Yesu wadupfiriye Ngwino nawe winjire murugo rw’Imana ubabarirwe reka
kwirengagiza Agakiza kabonetse kumusaraba igorogota reka kuguma hanze ngwino
Winjire mu rugo rw’Imana. 

3.
Mwene dataaa turakubwira umwami Yesu wadupfiriye yemeye kwitanga Kumusaraba
kugirango ubone ubugingo bw’iteka. Gut: Imitwaro n’imibabarooo ibyakubujije
amahorooo ibikubuza gusenga N’ibikwihebesha ntutinye Yesu aragutegereje
kugirango akuruhure Yesu aragutegereje kugirango agukize. 

Twese:
Ngwino winjire murugo rw’Imana inyuma ni habi ngwino (*2) Ngwino winjire murugo
rw’Imana inyuma ni habi yesu aragutegereje`
  },

  // -------------------------------------------------------------
  // IJURU (4 Songs)
  // -------------------------------------------------------------
  {
    id: 'song_14_ijuru_01',
    category_id: 'cat_ijuru',
    category_name: 'IJURU',
    category_slug: 'ijuru',
    category_number: 2,
    song_number: '1',
    title: 'TURI ABAGENZI',
    lyrics: `1.      Bakundwa turi abagenzi
kandi turi abimukira Iyo umuntu ari umugenzi azirikana cyane aho ari kujya Iyo
umuntu ari umugenzi ari murugendo rwiza Akumbura cyane iwabo.

 R/Nkumbuye cyane kwibera i Siyoni Nkumbuye
cyane kubona Imana Nkumbuye kubona uwanyitangiye Yesu Nkumuye cyane guhozwa
amarira.

 2. Iyo umuntu ari murugendo ahura
n’ibimurushya Ntidukwiye kugereranya imibabaro yo muri iyi si N’ubwiza tuzabona
tugeze iwacu Ntidukwiye kugereranya ibyago n’amakuba byo muri iyi si Iri
gushira n’umunezero tuzabona tugeze iwacu.

2.      Nitugera iwacu iyo mu
ijuru Yesu azatwakira n’ibyishimo Azatubwira ati”muruhuke bwoko bwanjye”
Atwambike ikamba ryera ryo kunesha Azadutambagiza Yerusalemu yarimbishijwe Maze
dutangire kuririmba iz’I Siyoni. 

R/2.
Tuzanezerwa tuzaririmba tuzanezerwa Igihugu twasezeranijwe n’Imana. Tuzanezerwa
tuzaririmba hareruya Tuzaririmba hareruya Amen.`
  },
  {
    id: 'song_14_ijuru_02',
    category_id: 'cat_ijuru',
    category_name: 'IJURU',
    category_slug: 'ijuru',
    category_number: 2,
    song_number: '2',
    title: 'INGOMA YAMAHORO',
    lyrics: `1.      Ingoma y’amahoro tuzayibamo
nitunesha kandi ibyaremwe byose Bitegereje iyo ngoma niyo tuzaruhukiraho, izaba
ari ingoma y’amahoro. 

R/1.Umwana muto azakinira kumwobo w’inzoka, isega n’umwana
w’intama Bizabana amahoro, inyamaswa ntizizaryana, izaba ari ingoma y’amahoro. 

2.      Akarengane ko mu isi,
intambara kubura abacu, gusonza, Gushavura ntibizaba kuri iyo ngoma. 

R/2.Tuzaba amahoro tutikanga ikibi, amaganya n’amarira ntabwo
bizahagera Intambara n’impuha zazo ntibizaba kuri iyo ngoma.

3.      Benedata bakundwa, bakunzi
b’umusaraba munezerwe mumitima Tubikiwe igoma y’amahora. 

R/3.Mwami wanjye ndifuza kuzaba kuri iyo ngoma nshoboza
kubiharanira nkiri muri Ubu buzima, gukiranuka, kuba maso ndabyifuza
binshoboze.`
  },
  {
    id: 'song_14_ijuru_03',
    category_id: 'cat_ijuru',
    category_name: 'IJURU',
    category_slug: 'ijuru',
    category_number: 2,
    song_number: '3',
    title: 'UZAMPE IHEREZO RYIZA',
    lyrics: `1.
Uzampe iherezo ryiza nk’iry’abakiranutsi uzampe kuraganwa n’abera Gakondo
wabateguriye, Mwami sinzagwe munzira ntarangije uru rugendo, Uzampe iherezo
ryiza icyo ni ikifuzo mporana. 

R/Kutazagera
mu ijuru nicyo gihombo gikabije kuzasigara mu iyi si ni Umubabaro udashira
Mwami uzampe kurangiza uru rugendo amahoro Uzampe iherezo ryiza icyo ni ikifuzo
mporana. 

2.
Hari abo twatangiranye iyi nzira ijya mu ijuru bamwe ntitukiri kumwe Bahisemo
kubireka, ubugingo tuzaragwa babuguranye indamu mbi, Uzampe iherezo ryiza icyo
ni ikifuzo mporana.

 3. Abavuga Mwami Mwami sibo bazabona Imana,
abakora ibyo yishimira Abo nibo bazayibona, abakerensa agakiza bazabona
ingaruka mbi, Uzampe iherezo ryiza icyo ni ikifuzo mporana`
  },
  {
    id: 'song_14_ijuru_04',
    category_id: 'cat_ijuru',
    category_name: 'IJURU',
    category_slug: 'ijuru',
    category_number: 2,
    song_number: '4',
    title: 'BAKUNDWA TURI ABANA BIMANA',
    lyrics: `1.
Bakundwa ubu turi abana b’Imana uko tuzasa kurahebuje Icyo tuzi ni uko uwo
mwami wacu niyerekanwa tuzasa (*2) nawe (*2) 

Fille:
Nubwa umuntu wacu winyuma yasaza ariko uko bukeye Uw’imbere aba mushya. 

Garcon:
Kubabazwa kwacu kw’igihwayihwayikw’akanya ka none Kwakiyongera. Tous:
Kuturemera ubwiza bw’iteka bw’iteka ryose (*2)

2.Dufite
ubwo butunzi munzabya z’ibumba kugirango imbaraga z’Imana Zibe izisumba
byose.(*2) 

Filles:Dusa
n’abatazwi turi ibirangirire dusa n’abakene Dutunbishije benshi. 

Garcons:Dusa
n’abapfuye nyamara turiho dusa n’abahanwa Ariko ntidutsindwa. Tous:Kugira
imbaraga z’Imana zibeizisumba byose. 

3.Bakundwa
ubwo dukorana nayo turabinginga mudaherwa Ubwo buntu kubupfusha ubusa mwihe
agaciro nk’abakozi b’Imana bagabura ibyayo kukintu cyose. 

Filles:
Ubwe yavuze ko azatura muri twe agendere muri twe Akorere muri twe. 

Garcons:
Tuzamubere ubwoko tumubere amahoro. 

Tous:
Bakundwa mwihe agaciro`
  },

  // -------------------------------------------------------------
  // GUSHIMA (3 Songs)
  // -------------------------------------------------------------
  {
    id: 'song_14_gushima_01',
    category_id: 'cat_gushima',
    category_name: 'GUSHIMA',
    category_slug: 'gushima',
    category_number: 3,
    song_number: '1',
    title: 'TURAGUSHIMA MANA',
    lyrics: `1.      Turagushima Mana turaguhimbaza
mukunzi we Kubw’ubuntu bwinshi watugiriye ukatugabira ukatugabira Umurimo eawe
ngo tuguheshe icyubahiro tukwamamaze Muri iyi si dushyire ejuru izina ryawe
amanywa n’ijoro 

2.      Hari impamvu ituma
tugushima Mana nuko udahwanye N’abana b’abantu Dawidi ati “nari umusore
ndashaje Sindabona umukiranutsi arekwa cyangwa ngo urubyaro rwe Rusabirize
ahubwo ahorana itoto iminsi yo kubaho kwe ashima Imana

  R/Ntacyo twabona twakwitura mwami Tugutuye
imitima yacu ngo uyiyobore amanywa n’ijoro Intambwe zacu zibe izo kuyoborwa
nawe Umwuka wera atubere umuyobozi.`
  },
  {
    id: 'song_14_gushima_02',
    category_id: 'cat_gushima',
    category_name: 'GUSHIMA',
    category_slug: 'gushima',
    category_number: 3,
    song_number: '2',
    title: 'NAGIRIWE UBUNTU NIMANA',
    lyrics: `1.      Nagiriwe ubuntu n’Imana
mbona inshuti nziza cyane Uwo ni Yesu mbaraga zanjye turi kumwe ndahumurizwa
Amba hafi buri munsi angenera ibinkwiriye.

 R/iyo nababaye
anyuzuza umunezero, mbuze uko nigira arampumuriza Abakunzi be nimuze tumushime,
tumurate, twamamaze urukundo rwe.

 2. Iyo nagize ibibazo
uwo mukunzi arabisubiza no mubyago Tiba turi kumwe mbese namugereranya nande,
uwo mukunzi Arakomeye umushikamishije k’umutima azamurinda abe amahoro masa. 

2.      Inshuti zijya zihinduka,
abavandimwe barahinduka N’ababyeyi bakwihakana ariko Yesu ntabwo ajya ahinduka
Kwiringira Uwiteka bigira umumaro biruta kwiringira abakomeye`
  },
  {
    id: 'song_14_gushima_03',
    category_id: 'cat_gushima',
    category_name: 'GUSHIMA',
    category_slug: 'gushima',
    category_number: 3,
    song_number: '3',
    title: 'REKA NDIRIMBIRE UMUKUNZI',
    lyrics: ` 1. Reka ndirimbire umukiza wanjye Yesu
indirimbo yo kumunezeza, Ni umwami w’abami ashobora ibidashoboka ashimwe. 

R/Niwe
wazuye Razaro amaze iminsi 4 mumva, niwe wahagije abantu Barenga ibihumbi 5,
niwe wahumuye Barutimayo wavutse ari impumyi Ashobora ibidashoboka ashimwe. 

2.Uwo
Yesu mubukwe bw’I Kana, yahinduye amazi kuba divayi Yagendesheje amaguru hejuru
y’inyanja, ageze kwa Yayilo Umwana arazuka.”Ashobora ibidashoboka ashimwe.”

3.
wowe ufite ibibazo waburiye igisubizo, ubimuzanire arabishoboye, uko yari ari
ejo nan’ubu niko ari ashobora ibidashoboka ashimwe`
  },

  // -------------------------------------------------------------
  // KWIZERA (4 Songs)
  // -------------------------------------------------------------
  {
    id: 'song_14_kwizera_01',
    category_id: 'cat_kwizera',
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    category_number: 4,
    song_number: '1',
    title: 'ABANYAMUGISHA',
    lyrics: `1.      Baraki yashatse kuvuma aba
islaheri kuko yariyumvise amateka yabo Asanga baramu aramubwira ati”mvumira
buriya bwoko nzabatsinde Uwo uhaye umugisha arawuhabwa koko uwo uvumye ahinduka
ikivume (None mvumira bariya bisilaheri)*

 R/Turi abanyamugisha twaratoranijwe n’uzashaka
kutuvuma Azatwirukaho agwe ruhabo ataradufata, tuzava muri iyi si Tukiri
abanyamugisha (kuko azi n’amazina yacu uwo mwami)*

2.
Baraki abwira Baramu ati ngaho bavume kandi nubavuma nzagushyira hejuru Baramu
agerageje biramunanira maze Uwiteka aramubwira have have Baramu have have
Baramu we mbese ninde ubasha kuvuma uwo ntavumye (Erega buriya bwoko nabuhaye
umugisha)*

 3. None nshuti waba unanijwe n’ibibazo by’isi
cyangwa intambara Tuza umutima niba Imanaikwishimira nta narimwe uzakorwa
n’isoni Ibikwasamiye ibibumbye iminwa aho uzajya hose Imana izakujya imbere
Washyizweho ikimenyetso cy’abanyamugisha erega washyizweho Ikimenyetso
cy’abanyamugisha.`
  },
  {
    id: 'song_14_kwizera_02',
    category_id: 'cat_kwizera',
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    category_number: 4,
    song_number: '2',
    title: 'BIBA MU GITONDO',
    lyrics: `1.      Biba mu gitondo imbuto
z’ineza, na nimugoroba ntureke kubiba, Biba izuba riva biba imvura iguye
nidutunda imiba tuzanezerwa. 

R/Tugeze mu
ijuru tuzanezerwa, Yesu azatwicaza maze adushimire, Ati muruhuke bagaragu beza,
umurimo wanjye mwawukoze neza.

 2. Tugende tubiba tubiba Umwami, niba
tubabazwa n’abantu barimbuka, Amasarura n’imirimo bishize, nyiri uruzabibu
azadushimira. 

2.      Abakozi mwese muri
muruzabibu mururinde cyane nk’abazarubazwa Nimufate izo ngunzu zona urzabibu
Databuja naza azabashimira`
  },
  {
    id: 'song_14_kwizera_03',
    category_id: 'cat_kwizera',
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    category_number: 4,
    song_number: '3',
    title: 'IMBARAGA',
    lyrics: `1.
Imbaraga, imbaraga, imbaraga z’Imana ndavuga imbaraga z’Imana Ndavuga gukomera
kw’Imana, ndavuga gutabara kw’Imana. Hari imbaraga zidasanzwe z’Imana hari
ukunesha kudasanzwe kw’Imana Imana nyamana iratabara kurugamba. Yatunguye
Gidiyoni asekura ingano yihisha abamidiyani iramubwira Iti Gidiyoni weee genda
genda ukw’imbaraga za we zingana. Garcons: Uzanesha 

Tous:
abamidiyani. R/Mbega imbaraga z’Imana mbega gukomera kw’Imana. 

2.Yatunguye
na Yosuwa kurugamba abona umugaboarabaza ati yewe muntu Uri uwo mubacu cg se
uri uwo mubabisha ati oya sindi uwo mubabisha Ndiumugaba w’izo mu ijuru manuwe
no gutabara, abagenda imbere baranesha

3.
Yatunguye Marodekayi n’Abayuda babibonye baratangara babwira Hamani, Hamani
Hamani wehe wibeshya kugambanira abayuda ni Ukutamenya ibabamo.Ni inyembaraga,
xtimes`
  },
  {
    id: 'song_14_kwizera_04',
    category_id: 'cat_kwizera',
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    category_number: 4,
    song_number: '4',
    title: 'MWISIRAHERI',
    lyrics: ` 1. Mwisiraheri hari umwami witwaga Sawuli
yajyaga aterwa n’imyuka mibi Dawidi akaririmba, Dawidi agasenga Dawidi (*3)
Dawidi akaririmba Dawidi agasenga. 

Filles:
Harimo umugabo 

Garcons:
Umugabo ukomeye umugabo w’igihangange, w’igihangange Goriyati yasuzuguraga
Imana agatuka Imana ningabo zayo Dawidi Aramureba arasenga ati Mana nyirijuru
wehehe mungabize Umungabize umungabize. 

2.Maze
Dawidi aragenda abwira Sswuri mwami nyaguhora kungoma Nyemerera ngende ngere
kurugamba ndwane n’umugabo nabonye Atuka Imana n’ingabo zayo. 

Filles:
Narwanye n’intare mu ishyamba nyaka intama.Ndwana n’idubu mu Ishyamba nyaka
intama none mu izina ry’Uwiteka ndamunesha ndamunesha Uwo Goriati ati:

 Garcons: Yewe sha ngwino nkubagire ibisiga
n’inyamaswa zo mu ishyamba maze Dawudi agenda yiruka arwana na Goriyati afata
akagozi akora mu mvumba afata Akabuye nuko aramwegera arazunguza arazunguza
(*2)pa!maze iryo buye ryica Goriyati Dawidi araririmba Dawidi araririmba`
  }
];

// Perform safe import into SQLite database
export function importFourteenSongs(dbPath = './data/lalumiere.db') {
  const db = new DatabaseSync(dbPath);

  console.log(`[Import 14] Initial songs count:`, db.prepare('SELECT count(*) as c FROM songs').get().c);

  const insertSong = db.prepare(`
    INSERT INTO songs (
      id, title, song_number, composer, category_id, release_status,
      release_date, description, display_order, status, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'released', '2016-03-08', ?, ?, 'published', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const insertLyrics = db.prepare(`
    INSERT INTO lyrics (id, song_id, content, language, created_at, updated_at)
    VALUES (?, ?, ?, 'rw', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  let added = 0;
  let alreadyExist = 0;

  for (let i = 0; i < fourteenSongs.length; i++) {
    const s = fourteenSongs[i];
    const existing = db.prepare('SELECT id FROM songs WHERE id = ?').get(s.id);
    if (existing) {
      alreadyExist++;
      continue;
    }

    const orderNum = parseInt(s.song_number, 10) || (i + 1);
    insertSong.run(
      s.id,
      s.title,
      s.song_number,
      'La Lumiere Choir',
      s.category_id,
      `Indirimbo ya ${s.song_number} muri ${s.category_name} - Chorale La Lumiere`,
      orderNum
    );

    insertLyrics.run(
      `lyr_${s.id}`,
      s.id,
      s.lyrics
    );
    added++;
  }

  console.log(`[Import 14] Added ${added} new songs, skipped ${alreadyExist} existing duplicates.`);
  console.log(`[Import 14] Final songs count:`, db.prepare('SELECT count(*) as c FROM songs').get().c);
  console.log(`[Import 14] Final lyrics count:`, db.prepare('SELECT count(*) as c FROM lyrics').get().c);
}

// Run immediately if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importFourteenSongs();
}
