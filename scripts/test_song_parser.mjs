import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import {
  parseSongDocumentToJSON,
  upsertSongRecords,
  parseAndUpsertSongDocument,
  normalizeTitle
} from '../server/songDocumentParser.ts';

console.log('--- 1. Testing normalizeTitle ---');
console.assert(normalizeTitle('DORE URUKUNDO') === 'dore urukundo', 'Title lowercase');
console.assert(normalizeTitle('TURASHIMA YESU.') === 'turashima yesu', 'Strips punctuation');
console.assert(normalizeTitle("INGOMA Y'AMAHORO") === 'ingoma yamahoro', 'Normalizes apostrophe');
console.assert(normalizeTitle('INGOMA Y’AMAHORO') === 'ingoma yamahoro', 'Normalizes curly apostrophe');
console.log('normalizeTitle tests passed!');

console.log('\n--- 2. Testing parseSongDocumentToJSON with 14-song document ---');
const docText = `INDIRIMBO ZA LA LUMIERE CHOIR
ZISHYIZWE MU BYICIRO 4
Icyitonderwa: Amagambo y’indirimbo yakoreshejwe uko ari muri document yatanzwe. Nta magambo y’indirimbo yahinduwe, akosowe cyangwa asimbujwe; hiyongereweho gusa ibyiciro.
AGAKIZA
1. NGWINO TUJYANE
1.      Ngwino tujyane iwacu aho
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

R/Ngwino reka gutinya nshuti Yesu ni Umunyebambe


2. DORE URUKUNDO
1.      Dore urukundo rutangaje,
Imana data yadukunze. Rwatumye itanga umwana wayo w’ikinege Kugirango umwizera
wese ntazarimbuke Ahubwo azahabwe ubugingo buhoraho. 

R/Uwo
yatubereye igitambo ibindi byose bikurwaho Yamennye amaraso y’igiciro kubwacu
Icumu yatewe murubavu, inkoni yakubiswe kubwacu (Ibyo nibyo yadukirishije)*

2.      Umuntu amaze gucumura ibye
byari birangiye Icyari gikurikiyeho rwari urupfu Kubw’imbabazi z’Imana itanga
umwana wayo Yesu Ngo abe ariwe upfa mucyimbo cyacu nashimirwe.

 R/2.Amaraso y’umwami Yesu niyo yabaye
ikimenyetso Kiduhuza n’Imana data.


3. YESU YESU MWAMI
1.
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
rw’Imana inyuma ni habi yesu aragutegereje

IJURU
1. TURI ABAGENZI
1.      Bakundwa turi abagenzi
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
tuzaririmba hareruya Tuzaririmba hareruya Amen.


2. INGOMA YAMAHORO
1.      Ingoma y’amahoro tuzayibamo
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
binshoboze.


3. UZAMPE IHEREZO RYIZA
1.
Uzampe iherezo ryiza nk’iry’abakiranutsi uzampe kuraganwa n’abera Gakondo
wabateguriye, Mwami sinzagwe munzira ntarangije uru rugendo, Uzampe iherezo
ryiza icyo ni ikifuzo mporana. 

R/Kutazagera
mu ijuru nicyo gihombo gikabije kuzasigara mu iyi si ni Umubabaro udashira
Mwami uzampe kuraganwa n’abera. 

2.
Hahirwa abazapfa bizera umwami yesu imirimo yabo myiza Izabaherekeza, hahirwa
abazashyika iyo mw’ijuru amaso Yabo azabona umwami yesu. 

3.
Nzataha i muhira amashimwe azansendereza umutima nzaririmba Nshimire Yesu
wampaye kunesha.


4. BIBA MU GITONDO
1.      Biba mu gitondo imbuto
z’urukundo Biba ku manywa ndetse na mugoroba Rindira isarura ibisarurwa
byeze, Tuzazana imiba dushimye. 

R/Tuzazana
imiba (dushimye*2) Tuzazana imiba dushimye. 

2.      Biba mu mucyo biba no
mu mwijima Ntutindiganye nubwo imbeho yaza Icyuya n’amarira bizashira vuba
Tuzazana imiba dushimye. 

3.      Genda urira ujya kubiba
imbuto Nubwo uhura n’ibikubabaza Iyo mirimo niramuka irangiye Tuzazana imiba
dushimye.


GUSHIMA
1. TURAGUSHIMA MANA
1.      Turagushima Mana kuko
watubereye ibyiringiro Ntidukorwe n’isoni, imiraba yisukiranya hejuru yacu
Watubereye ubwugamo. 

R/Mana
yacu waratwibutse ntiwatwibagiwe ntiwatubabaje N’umubyeyi yibagirwa umwana
yonse ariko wowe ntujya Utwibagirwa. 

2.      Urukundo rwawe ruduhumuriza
imitima Igitondo cyose imbazi zawe zihora ari nshya Nta cyadutandukanya
n’urukundo rwawe. 

3.      Niyo twanyura mu mazi
ntazaturengera Naho twanyura mu muriro ntidushya, intambara zikomeye
Tuzazitsinda kuko uri kumwe natwe.


2. NAGIRIWE UBUNTU NIMANA
1.      Nagiriwe ubuntu n’Imana
ndayishima, ntabwo ari uko Nari nkwiriye ahubwo ni ubuntu bwayo. 

R/Ubuntu
bwayo burahagije mu buzima bwanjye, Bunkura kure bungeza kure, ndashima Mana. 

2.      Ibyo mfite byose mbikesha
ubuntu bwayo, ubuzima N’amahoro byose ni ubuntu bwayo. 

3.      Nzayisingiza iteka ryose
kubw’ubuntu bwayo, Sinzahwema kuyishimira ibyo yankoreye.


3. IMBARAGA
1.      Imbaraga z’Imana nizo
zidukomeza, niyo yaduhaye Kunesha no gutsinda mu ntambara zose. 

R/Niwe
mubyeyi utwitaho, niwe rufatiro rwacu Nta cyadutera ubwoba kuko ari kumwe
natwe. 

2.      Nubwo imiraba yaza
ntiduhungabana, kuko dufite Umurengezi utajya unanirwa. 

3.      Imana yacu niyo gukomerwa
amashyi, amashimwe Yacu niyo akwiriye iteka ryose.


KWIZERA
1. ABANYAMUGISHA
1.      Abanyamugisha nibo
biringira Uwiteka, bameze Nk’igiti cyatewe hafi y’imigezi y’amazi. 

R/Ntibazakorwa
n’isoni, amakuba ntiyabageraho Kuko Uwiteka ari ingabo ibakingira. 

2.      Mu bihe by’amapfa
ntibazabura imbuto, imirimo Yabo izahora itoshye kuko biringiye Imana. 

3.      Kwizera Imana nicyo cyonyine
gikiza, dukomere Ku byiringiro byacu kugeza ku mperuka.


2. BIBA MU GITONDO
1.      Biba mu gitondo imbuto
z’urukundo Biba ku manywa ndetse na mugoroba Rindira isarura ibisarurwa
byeze, Tuzazana imiba dushimye. 

R/Tuzazana
imiba (dushimye*2) Tuzazana imiba dushimye. 

2.      Biba mu mucyo biba no
mu mwijima Ntutindiganye nubwo imbeho yaza Icyuya n’amarira bizashira vuba
Tuzazana imiba dushimye. 

3.      Genda urira ujya kubiba
imbuto Nubwo uhura n’ibikubabaza Iyo mirimo niramuka irangiye Tuzazana imiba
dushimye.


3. IMBARAGA
1.      Imbaraga z’Imana nizo
zidukomeza, niyo yaduhaye Kunesha no gutsinda mu ntambara zose. 

R/Niwe
mubyeyi utwitaho, niwe rufatiro rwacu Nta cyadutera ubwoba kuko ari kumwe
natwe. 

2.      Nubwo imiraba yaza
ntiduhungabana, kuko dufite Umurengezi utajya unanirwa. 

3.      Imana yacu niyo gukomerwa
amashyi, amashimwe Yacu niyo akwiriye iteka ryose.


4. MWISIRAHERI
1.      Mwisiraheli habaye
intambara ikomeye hagati Y’abafilistiya n’Abisiraheli Goriyati akajya Atuka
ingabo z’Imana. 

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
(*2)pa!maze iryo buye ryica Goriyati Dawidi araririmba Dawidi araririmba`;

const parsed = parseSongDocumentToJSON(docText);
console.log(`Parsed ${parsed.length} songs from sample document.`);

parsed.forEach((s, idx) => {
  console.log(`${idx + 1}. [${s.category}] "${s.title}" (lyrics length: ${s.lyrics.length})`);
  // Validate schema
  console.assert(typeof s.title === 'string' && s.title.length > 0, 'title string');
  console.assert(['AGAKIZA', 'IJURU', 'GUSHIMA', 'KWIZERA'].includes(s.category), 'valid category');
  console.assert(typeof s.lyrics === 'string' && s.lyrics.length > 0, 'lyrics raw string');
});

console.log('\n--- 3. Testing upsertSongRecords into real database service ---');
const report1 = upsertSongRecords(parsed);
console.log(`First upsert: total=${report1.totalProcessed}, inserted=${report1.insertedCount}, updated=${report1.updatedCount}`);

// Test duplicate prevention: re-run upsert with the SAME parsed songs
console.log('\n--- 4. Testing duplicate prevention on second upsert run ---');
const report2 = upsertSongRecords(parsed);
console.log(`Second upsert: total=${report2.totalProcessed}, inserted=${report2.insertedCount}, updated=${report2.updatedCount}`);

console.assert(report2.insertedCount === 0, 'Zero songs inserted on second run because titles existed!');
console.assert(report2.updatedCount === parsed.length, 'All songs updated instead of duplicated!');
console.log('Duplicate title prevention verified!');
