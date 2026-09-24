import fs from 'fs';

// Raw text from the prompt
const rawPromptText = `Category 1. AGAKIZA 
1. URUKUNDO
1. Dore urukundo rutangaje , Imana data 
yadukunze. 
Rwatumye itanga umwana wayo w’ikinege 
Kugirango umwizera wese ntazarimbuke  
Ahubwo azahabwe ubugingo buhoraho. 
 
                     R/Uwo yatubereye igitambo ibindi 
byose bikurwaho 
                       Yamennye amaraso y’igiciro kubwacu 
                        Icumu yatewe murubavu,  inkoni 
yakubiswe kubwacu 
                        (Ibyo nibyo yadukirishije)*3Yesu. 
2. Umuntu amaze gucumura ibye byari birangiye 
Icyari gikurikiyeho rwari urupfu 
Kubw’imbabazi z’Imana itanga umwana wayo Yesu 
Ngo abe ariwe upfa mucyimbo cyacu nashimirwe. 
 
                   R/2.Amaraso y’umwami Yesu niyo 
yabaye ikimenyetso 
                         Kiduhuza n’Imana data. 
          
2. TURASHIMA YESU.
1. Turashima Yesu wemeye kwitanga akemera no 
gupfa urupfu rubi 
Kubwacu yemeye kwambura icyubahiro cyose 
yambara umubiri 
Ngo abashe kuducungura. 
                      R/Ntawundi ni Yesu ntawundi ni Yesu 
niwe nzahora nirata  
                         Atanga amahoro atanga ubugingo , 
niwe rufatiro itorero ryubatseho. 
2. Yasize ubwiza bwose yari afite mu ijuru 
ababarana natwe  
Afite impuhwe n’urukundo yigisha iby’ubwami 
n’uko ariwe nzira yo 
 Kunesha kubohorwa ndetse n’ubugingo. 
3. Urupfu rwa Yesu rwahindishije isi yose 
umushyitsi mwinshi 
Maze ahita ajya I kuzimu arwana na Satani 
amwambura ubutware 
Azukana n’abera kuva ubwo twabonye intsinzi. 
                           Amaraso yaYesu niyo atweza,  
amaraso ya Yesu niyo adukiza 
                           Akadukuraho ibyaha tukababara 
natwe tukinjira mu 
                           Muryango w’abana b’Imana.

3. NOHERI.
                                    R/.Noheri Noheri itwibutsa 
ivuka ry’umwami Yesu, kandi uwo azanywe  
                                     No gukiza ibyaha by’abari mu 
isi bose 
1. Dore umwari azasama inda kandi azabyare 
umuhungu azitwa 
Emanueli risobanura ngoooo Imana iri kumwe 
natwe. 
2. Baraki ati ndamureba ariko s ’ ubu 
ndamwitegereza ntandi bugufi 
Inyenyeri izakomoka kwa Yakobo inkoni y’ubwami 
ni mu Islaheli. 
3. (Dore umwana yatuvukiye duhawe 
umwana w’umuhungu)x2 

Ubutware buzaba ku bitugu bye azitwa Emaneli 
Imana isumba byose 
Ysu yazanywe no gushaka abarushye 
n’abaremerewe ngwino nawe  
 Nshuti yanjye reka gutinda Yesu ni igisubizo. 
                          R/Mu ijuru icyubahiro kibe 
icy’umwami Mana, No mu isi amahoro abe mubo 
Imana yishimira. 
4. NTABWO TWIBESHYE.
1. Yesu ntitwakuvaho nubwo byagenda gute 
ntitwakuvaho haba mu makuba menshi 
Ni ukuri Yesu ntitwakuvaho nari mu isayo y’ibyaha 
Yesu aransayura, nari mu mwijima 
ukomeyeYesu aramurikira, Yesu uri mwiza. 
                       R/Ntago twibeshye kuyikorera ibyo 
dufite byose tubikesha Imana, 
                          N’aho tugeze niyo ihatugejeje … 
(Imana yacu ngewe)  
                          Sinzayivaho….sinzayireka. 
2. Urukundo rwinshi wadukunze nirwo rudutera 
kukwamamaza. 
Ngo amahanga yose akumenye kuko uri Imana igira 
neza (*2) 
(Abaririmbyi nabo bakumenye) kuko uri Imana igira 
neza. 
3. Gukorera Imana nibyiza ubikore ubikunze kandi 
uzagororerwa   
Nubwo kuyikorera bitoroshye ariko iyo iguhembye 
iragukubira. 
Imibabaro yose ikarangira ukabona kugira neza 
kwayo.

5. YESU YESU MWAMI.
1. Yesu Yesu mwami Yesu Yesu mukiza urukundo 
rwawe wadukunze 
Mwami wanjye rurahebuje ibyo wankoreye 
nibyinshi ibyo wankoreye 
Bisumbye uko mbivuga. 
                          R/Wadukuye mu ivata ry’ibyaha 
ry’ibyaha utwigiza hafi y’amasezerano  
                            Kera ntitwari ubwoko mwami ariko 
ubu twigijwe hafi Mana turagushimye. 
2. Ni iki gihesha ubugingo buhoraho ni ukumenya 
Yesu wadupfiriye 
Ngwino nawe winjire murugo rw’Imana  
ubabarirwe reka kwirengagiza 
Agakiza kabonetse kumusaraba igorogota reka 
kuguma hanze ngwino  
Winjire mu rugo rw’Imana. 
3.  Mwene dataaa turakubwira umwami Yesu 
wadupfiriye yemeye kwitanga 
Kumusaraba kugirango ubone ubugingo bw’iteka. 
Gut: Imitwaro n’imibabarooo ibyakubujije 
amahorooo ibikubuza gusenga 
N’ibikwihebesha ntutinye Yesu aragutegereje 
kugirango akuruhure  
Yesu aragutegereje kugirango agukize. 
Twese: Ngwino winjire murugo rw’Imana inyuma ni 
habi ngwino (*2) 
             Ngwino winjire murugo rw’Imana inyuma ni 
habi Yesu aragutegereje 
 

6. YARATSINZE.
1. Turashima umwami w’abami uwo nta wundi ni 
Yesu 
Yaritanze k’umusaraba niyo mpamvu natwe turiho 
Kandi tuzahora tumushima Haleluyaaa. 
                         R/Yaratsinze ooo yaratsinze  
                            Yaratsinze….yaratsinze amen. 
2. Kuva uwo munsi koko ashobora byose imibabaro 
yacu 
Yayihinduye ibitwenge imitwaro yose 
yaduhetamishaga 
Yayikuyeho ninayo mpamvu tugenda twemye. 
3. Yesu wacu kumusaraba yaravuze ati byose 
birarangi 
Umwenda wari ukingirije ahera utabukamo kabiri  
Bivuga ngo twese twigererayo. 
 
                                          
 
 
 
 
 
 
 
 
 
7. IKIRARA.
1. Ngwino tujyane iwacu aho Imana yateguriye 
abera  
Aho bazaba iteka ryose ngwino nshuti reka 
gutinda. 
GUT: Kandi umunyabyaha ntakwiriye kwinjira aho 
hera 
         H’Imana ikomeye ndatinye sinayigera imbere 
nakoze  
         Ibyaha byinshi ntiyanyemerera. 
KWIK: Reka gutinya mwene data imbabazi z’Imana 
zihoraho 
           Ntabwo ibyaha byawe byatukura tuku tuku 
Yesu ni umunyembabazi. 
2. Mwene data umvira iryo jwi riguhamagara ngo 
ugaruke ubabarirwe  
Umere nka wamwana w’ikirara wagarutse kwa se 
aramwakira. 
GUT: Data nari narazimiye narajarajaye mubyaha 
mbura amahoro 
         Singikwiriye kwitwa umwana wawe data 
umbabarire ungire umwe 
         Mubakozi bawe  uu! data ndagarutse ungire 
umwe mubakozi bawe. 
KWIK: Ngwino mwana w’Imana ubabarirwe ibyaha 
byawe byose  
            So wo mu ijuru arakwakira vuba nshuti 
garuka murugo. 
                      R/Ngwino reka gutinya nshuti Yesu ni 
umunyebambe.

8. AMARASO.
                                R/Amaraso ya Yesu yaduhinduye 
abana b’Imana ayo maraso 
                                   Ni ntagereranywa yatumye 
abera tumenyana. 
1. Isaha y’Imana igeze Yesu aremera baramufata 
bamujyana kwa Pirato 
Amucira urubanza aremera baramubamba 
umwenda wari ukingirije ahera 
Utabukamo kabiri bivuze ngo twemerewe kwinjira 
ahera Yesu yaduhuje n’Imana. 
2. Iyo yesu ataza mu isi mbere ngo aduhuze 
n’Imana agahinda n’umubabaro biba  
Byaraduheranye bene data twebwe twitwaga 
abanyamahanga agakiza kari  
Ak’abisiraheri Yesu yaratwibutse. 
                              Gut: Abari kure twigijwe hafi Yesu 
twamwitura iki. 
                                      Abari imbohe twigijwe hafi 
Yesu twamwitura iki. 
                                      Yesu twamwitura iki (*4)  
 
 
9. NTACYAHA.
1. Akira umwana nta cyaha yakoze yakuze agwiza 
imbaraga n’ubuntu 
Ibimwuzuye nibyo yaduhaye dore ni ubuntu 
bugeretse k’ubundi. 
2. Yaragandutse ntiyanga no gupfa urupfu rubi rwo 
kumusaraba 
Yarababajwe turababarirwa,  baramubambye 
turabamburwa 
Muri ibyo byose ntacyaha yakoze abasabira 
imbabazi ati Mana  
Ubababarire. 
3. Byatumye Imana imushyira hejuru imuha izina 
ZINA risumba ayandi 
Indimi zose zature ko ari Umwami none ari iburyo 
bw’Imana ihoraho 
Ahora adusabira.

10. YESU OH YESU.
1. Yesu oh Yesu uwo mwami uwo mwami icyo 
gitare icyo gitare  
Niwe ndiho kandi ndiho azahoraho uwo mwami 
niyaza*3nzaba 
Nduhutse imiruho n’imihate. 
2. Yesu oh Yesu iyo ntare iyo ntare icyo gishyitsi cya 
Dawidi niwe 
Byiringiro byacu umwizera wese Mwizera Mwizera 
ntacyo azatwarwa 
N’urupfu rwa kabiri. 
3. Yesu oh Yesu niwe jambo niwe jambo niwe 
mucyo *2 w’ubugingo  
Niwe uruhura abarushye akabaha amahoro,  
Mahoro, Mahoro ayo mahoro 
Sink’abisibatanga.

11. YESU NI IGISUBIZO.
1. Yesu nibyose muri byose abamufite baguwe neza 
niwe mfura yo mubazutse 
Uwo mwami niwe ndirimba. 
2. Ageze mubukwe bw’I Kana asanga abantu bafite 
inyota nuko ahindura amazi  
Divayi abantu baranywa bashira inyota. 
 
3. Uwo mwami yakizaga impumyi agahagurutsa 
ibimuga nanubu arakora  
Ibitangaza mbese ninde utamuvuga ibigwi. 
                            R/Yesu ni igisubizo.

12. IGITI CY’INGANZAMARUMBO.
                         R/Yesu*3giti cy’ inganzamarumbo 
bwugamo bw’umugaru sambu itarumba 
                            Ysu giti cy’inganzamarumbo*2 
1. Uri urutare rutanyeganyega ukubatseho 
ntazigera akorwa n’isoni buye rizima 
 ryanzwe n’abubatsi ariko ku Mana ryabaye 
irikomeza imfuruka.(*2) 
Twubake twuba ke twubake kuri we Yesu giti 
cy’inganzamarumbo (*2) 
2. Nkumutapuwa mubiti by’ishyamba niko 
umereye giti cy’inganzamarumbo 
Amatinda yawe arandyohera Yesu giti 
cy’inganzamarumbo  
Mugicucu cyawe niho nduhukira mpabonera 
amahoro giti cy’inganzamarumbo (*2) 
Tugume tugume tugume muri weYesu giti 
cy’inganzamarumbo (*2) 

13. MANA URI MWIZA.
1. Mana uri mwiza utagushima ninde?  utagushima 
yava he? 
Utagushima yaturuka he?  warabambwe 
ndabamburwa  
Warakubiswe ndakira ha ha ha Yesu (*2) 
2. Erega Mana uri igitangaza uri mwiza ntawe 
uhwanye nawe 
Twari dupfuye tuzize ibyaha byacu twebwe 
abanyamahanga 
Twari dutandukanijwe nawe turi kure 
y’amasezerano ho ho ho yawe (*2) 
3. Jyewe ndabona iyi minsi iteye ubwoba abantu 
bavuye mu masezerano 
Bateye igihugu umugongo jyewe ntabwoba mfite 
kuko ndi kumwe n’umunyembaraga ha ha ha Yesu 
(*2) 
                               R/S: Ndagushima Yesu 
                                 TS: Kubw’urukundo wankunze 
                                 S: Ndagushima mwami 
                                TS: Kubw’imbabazi wangiriye 
jyewe, jyewe munyabyaha 
                                    Nari kuba he iyo ntabona 
umwami Yesu, jyewe, jyewe  
                                    Munyabyaha nari kuba he iyo 
ntabona umucunguzi (*2)

15. CHORAS.
1. Negereye intebe yawe nzanye ibimazi 
2. Nimesikiya samba ananguluma 
3. Imana ninziza (*3) cyane 
4. Ntakintu mfite nokwirata 
5. Tuzatambatamba mu ijuru 
6. Hari imbaraga z’igitangaza mumaraso yaYesu 
7. Ndayashima maraso ya Yesu 
8. Reka amazi y’ubugingo antembemo  
9. Ye ye Imana irakomeye 
10. Umwuka w’Imana iyo aje sinshobora 
11. Ngwino mwuka wera turi imbere yawe 
12. Abana b’islaheri mw’egiputa barasubijwe cyane 
13. Ntabwo nziganyira ntabwo nziheba izina rya 
Yesu ni igisubizo 
 
                                      
 
 
 
 
 
 
 
 
 
16. NIMUREKE MVUGE.
1. Nimureke mvuge kuko mfite uruvugiro kandi 
mureke ndirimbe kuko hari uwo  
Ndirimba uwo mwami wankunze uwo mwami 
wambohoye nkaba ngenda nidegembya 
Nguwe neza kubw’uwo mukiza. 
2. ni ukuri intimba zacu nizo yishyizeho imibabaro 
yacu niyo yikoreye  
Ibicumuro byacu nibyo bamucumitiye igihano 
kiduhesha amahoro  
Cyari kuri uwo mwami. 
3. Ubutwari muri Yesu kandi ubu turatuje muri we 
nta mbogamizi  
Twifitiyemo amahoro dufite ibyiringiro byo 
kuzagera mu ijuru  
Tuzabana nuwo mwami twicaranye kuntebe 
y’ubwami. 
                         R/Yarankunze (*4)umpa ubugingo 
umpa amahoro  
                             Yesu umpa agakiza.  
 
                                   
 
 
 
 
 
 
 

17. MBESE NKANJYE NARI IKI?
1. Mbese nkanjye nari iki mucunguzi mbese 
nkanjye nari iki mukiza mbese nkanjye 
Nari iki mwami wanjye cyatumye unkunda 
urukundo rutangaje (*2) 
2. Wampaye amaguru,  amaboko n’ubwenge umpa 
agakiza kawe n’umwuka wera 
Umpa kuba urugingo rwawe C hristo umpa 
kugabana n’ibyo munzu yawe (*2) 
3. Benshi kurubu bamaze gutambuka abanduta abo 
tungana wandinze  
Ntakiguzi natanze mwami nzajya ngushimira urwo 
rukundo rwawe (*2) 
                           R/Wankunze nkiri urusoro munda ya 
mama ndi umwana muto 
                                Wari umfitiye umugambi nkiri 
mubyaha ntabwo wigeze 
                                Undeka kugeza ubwo umpa 
agakiza kawe mwami nzajya 
                                 Ngushima mucunguzi wanjye (*2)

18. IZINA RYA YESU.
                            R/Izina rya Yesu rifite imbaraga,  
izina rya Yesu rifite ubushobozi 
                                Izina rya Yesu rifite ubutware,  
izina rya Yesu rirakomeye. 
1. Reka ndivuge ibigwi,  ndivuge ibigwi nari 
indushyiriranduhura, nari impumyi 
Rirampumura, nari imbohe rirambohora,  nari 
intumbi riranzura  
Izina rya Yesu rirakomeye (*2) 
Reka ndivuge ibigwi ndivuge ibigwi muri ryo 
abadayimoni barahunga 
Muri iryo zina abarwayi barakira muri iryo zina 
impumyi zirahumuka  
Muri iryo zina ibimuga biragenda,  izina rya Yesu 
rirakomeye (*2) 
3. reka ndivuge ibigwi ndivuge ibigwi ntarindi zina 
twahawe gukirizwamo  
Yesu niwe nzira n’ukuri n’ubugingo ntawe ujya kwa 
Data atarawe  
Umujyanye, izina rya Yesu rirakomeye (*2) 
 
 
                             

19. MBARAGA ZACU.
1. Mbaraga zacu gakiza kacu mahoro yacu niwowe 
byiringiro byacu. 
                     R/Jehova jire,  Jehova nisi, Jehova 
shama, Jehova mikadeshi  
                        Jehova elohimu ni ukuri wagize neza 
waraturinze wabaye 
                         muruhande rwacu. 
2. Dore izuba ryaturasiye rifite ugukiza mumababa 
yaryo urumuri rucumba 
Ntabwo yarujimije urubingo rusadutse ntabwo 
yarumennye (*2)         
3. Shimwa Mana kubw’ibyo ujya ukora (kubw’ibyo 
wakoze) waraturinze  
Wabaye muruhande rwacu sikubw’imbaraga zacu 
cg se ubwenge bwacu  
Wabikoze kubwo gukiranuka kwawe (*2) 
 
 
                                  
 20. NTABWO TUZAPFA TUZARAMA.
                           R/Ntabwo tuzapfa ahubwo 
tuzaramba (*2) 
1. Ndabwiza ukuri kuwemeye kunywa kumaraso 
yanjye akarya k’umubiri 
 Wanjye uwo ntazapfa ahubwo azarama (*2) 
2. Yesu ubwe yaravuze ati byose ndabirangije 
iby’ibitambo n’amaturo 
Birarangiye ntabwo tuzapfa ahubwo tuzarama (*2) 
3. Shimira Imana kubw’urukundo rwayo rwinshi 
gutanga umwana wayo 
 w’ikinege akabambwa kubwawe nanjye 
n’ibicumuro byacu twese  
ntabwo tuzapfa ahubwo tuzarama (*2) 
                              CHORAS. 
Niringiye imbabazi zawe n’urukundo rwawe 
Mwami namenye ko 
Ntawakwiringiye uzigera akorwa n’isoni. 
 
                               
 
 
 

21. YEWE MUGENI WANJYE.
1. Yewe mugeni wanjye we narakunze naguhaye 
amaraso yanjye kugirango  
Hatagira ukuntwara none se wa mbere wahindutse 
kumaze kuwuhindanya. 
2. Ibuka imisumari minini natewe mubiganza icumu 
amaraso n’amazi nabyo 
 Ntubyibagirwe reka ibyisi bigushuka mpindukirira 
gusa mfite ibyiza kurushaho 
Kandi nzaguha ubugingo. 
3. Nari mfiteingabo iyo mu ijuru nari mpanywe 
n’Imana abakuru barapfukamaga  
Ibizima bikandamya ariko ibyo sinabyitayeho 
sinabigundiriye nashatse yuko 
Tuzabona mubwami bwo mu ijuru 
                           R/Garuka garuka garuka (*2)  yewe 
mugeni wanjye we  
                               Ndakubabarira (*2)  
 
                                   
 
 
 
 
 
 
 
 22. WAMUGOROBA I GETSIMANI.
1. Wamugoroba I Getsimani Yesu yasenganye 
umubabaro yabize ibyuya bivanze 
 n’amaraso nibyo byaduhindukiyemo agakiza. 
2. Yarakubiswe arasuzugurwa baramubamba 
bamwica urupfu rubi nyamara 
We ntacyaha yakoze yazize ibyanjye hamwe 
nibyawe. 
3. Yamaze iminsi itatu mugituro kuko ariko byari 
byarahanuwe kuri uwo munsi  
Wagatatu arazuka nimuzima uwo mwami ntagipfa. 
                       R/None mugenzi ibyo ukora nibiki 
kuramira mubyaha ibyo yabambiwe 
                           Reka kumusubiza k’umusaraba 
wihane uyu munsi arakubabarira 
                          amaraso yayatanzeho ingwate. 
                       R/Numunezero mwinshi kuri twe kuva 
uyu munsi Y esu yazutseho 
                          Yatsinze urupfu ndetse nakuzimu 
nimuzima uwo mwami ntagipfa.

23. TURASHIMA YESU.
1. Turashima Yesu wemeye kwitanga akemera no 
gupfa urupfu rubi kubwacu 
Yemeye kwambura icyubahiro cyose yambara 
umubiri ngo abashe kuducungura (*2) 
2. Yasize ubwiza bwose yari afite mu ijuru 
ababarana natwe afite impuhwe n’urukundo 
Yigisha iby’ubwami nuko ariwe nzira yo kunesha,  
kubohorwa ndetse ubugingo (*2) 
3. Urupfu rwa Yesu rwahindishije isi yose 
umushyitsi mwinshi maze ahita ajya ikuzimu 
Arwana na Satani amwambura ubutware azukana 
n’abera kuva ubwo twabonye insnzi (*2) 
                          R/Amaraso yaYesu  (*2) niyo atweza 
niyo adukiza akadukuraho ibyaha  
                             Tukaba abera maze tukibera 
mumuryango w’abanab’Imana (*2) natwe 
                              tukibera mumuryango (*3)  
w’abana b’Imana. 
                           R/Ntawundi ni Yesu (*3)  niwe 
nzahora nirata atanga amahoro  
                                Atanga ubugingo niwe rufatiro 
itorero ryubatseho (*2) 
 
                                    
24. NIMUMWEGERE YESU.
T.Nimumwegere Yesu (*4) 
Ts: Kuko ariwe buyeryanzwe n’abubatsi ariko 
kumana ryaratoranijwe (*2) 
                      R/Yaje mube ntibamwemera,  
abamwemeye bose bakizera izinarye 
                          Yabahaye ubutware bwo kuba abana 
b’Imana, muri we niho  
                          Tubonera ubugingo (*2) 
2. Niwe tangiriro akabo n’iherezo (*4) 
TS: Ntawamubanjirije ntanuzamuheruka igishyitsi 
cya Dawidi yaramunejereje (*2) 
                        R/Mwse abarushye n’abaremerewe 
nimuze kwa Yesu arabaruhura.

25. MFITE AMATSIKO.
1. Mfite amatsiko mumutima yo kureba umwami 
wankunze akaza mu isi  
Akamfira akababazwa ngo mbabarirwe 
yarakubiswe uwo mwami wanjye 
Agera n’aho kubambwa,  ibyo byose iyo 
mbitekereje umutima urushaho gukumbura. 
                        R/Urukumbuzi ruranyishe mbuze 
amababa ngo nguruke ariko 
                            Nzi yuko amaherezo umukunzi 
wanjye nzamubona. 
2. Yasize avuze yuko agiye gutegura aho tuzaba ngo 
aho ari natwe tuzabeyo 
Aho tutazongera gutana tuzabonayo intwari 
zambere zatubanjirije iyi nzira 
Twabikiwe y’ibyiza byinshi tuzabihabwa tugezeyo.

Category 2. IJURU, UBUGINGO BW'ITEKA N'AMASEZERANO

1. TURI ABAGENZI
1. Bakundwa turi abagenzi kandi turi abimukira 
Iyo umuntu ari umugenzi azirikana cyane aho ari 
kujya Iyo umuntu ari umugenzi ari murugendo 
rwiza 
Akumbura cyane iwabo. 
                          R/Nkumbuye cyane kwibera i Siyoni 
                             Nkumbuye cyane kubona Imana  
                             Nkumbuye kubona uwanyitangiye 
Yesu 
                             Nkumuye cyane guhozwa amarira. 
2. Iyo umuntu ari murugendo ahura n’ibimurushya 
Ntidukwiye kugereranya imibabaro yo muri iyi si 
N’ubwiza tuzabona tugeze iwacu 
Ntidukwiye kugereranya ibyago n’amakuba byo 
muri iyi si 
Iri gushira n’umunezero tuzabona tugeze iwacu. 
3. Nitugera iwacu iyo mu ijuru Yesu azatwakira  
n’ibyishimo 
Azatubwira ati”muruhuke bwoko bwanjye” 
Atwambike ikamba ryera ryo kunesha 
Azadutambagiza Yerusalemu yarimbishijwe 
Maze dutangire kuririmba iz’I Siyoni. 
                 R/2. Tuzanezerwa tuzaririmba 
tuzanezerwa  
                  Igihugu twasezeranijwe n’Imana. 
                  Tuzanezerwa tuzaririmba hareruya 
                  Tuzaririmba hareruya Amen.

2. AMASEZERANO.
1. Amasezerano y’Uwiteka nubwo yatinda ntajya 
ahera*2 
 Imana yacu si umuntu ngo ibeshye,  Imana yacu si 
umuntu ngo yicuze 
  Ibyo yatubwiye no kubikora izabikora,ibyo 
yatwemereye no kubiduha izabiduha. 
2. Siko bizahora mubategereza Imana,  
mubayitegereza ntawe uzakorwa n’isoni 
Siko bizahora mubategereza Imana,  mubayitereza 
ntawe uzakorwa n’isoni. 
 Abava mu masezerano ntampamvu *2 abo nibo 
bazakorwa n’isoni. 
3. Iyatanze umwana wayo ikamutanga kubwacu 
ngo atubere igitambo*2 
Izabura ite kumuduhana n’ibindi *2irinda iserano 
ryayo imyaka ibihumbi *2 
Izabikora izabikora IMIana,  nokubikora izabikora,  
izabiduha izabiduha Imana  
No kubiduha izabiduha. 
 
 
  
3. INGOMA Y’AMAHORO.
1. Ingoma y’ amahoro tuzayibamo nitunesha kandi 
ibyaremwe byose  
Bitegereje iyo ngoma niyo tuzaruhukiraho, izaba ari 
ingoma y’amahoro. 
                      R/1.Umwana muto azakinira kumwobo 
w’inzoka, isega n’umwana w’intama 
                          Bizabana amahoro,  inyamaswa 
ntizizaryana, izaba ari ingoma y’amahoro. 
2. Akarengane ko mu isi,  intambara kubura abacu,  
gusonza, 
Gushavura ntibizaba kuri iyo ngoma. 
                  R/2.Tuzaba amahoro tutikanga ikibi , 
amaganya n’amarira ntabwo bizahagera 
                        Intambara n’impuha zazo ntibizaba 
kuri iyo ngoma. 
3. Benedata bakundwa,  bakunzi b’umusaraba 
munezerwe mumitima 
Tubikiwe igoma y’amahora. 
                   R/3.Mwami wanjye ndifuza kuzaba kuri 
iyo ngoma nshoboza kubiharanira nkiri muri  
                       Ubu buzima , gukiranuka, kuba maso 
ndabyifuza binshoboze.

4. BIBA MU GITONDO.
1. Biba mu gitondo imbuto z’ineza,  na nimugoroba 
ntureke kubiba, 
Biba izuba riva biba imvura iguye nidutunda imiba 
tuzanezerwa. 
                       R/Tugeze mu  ijuru tuzanezerwa,  Yesu 
azatwicaza maze adushimire, 
                          Ati muruhuke bagaragu beza , 
umurimo wanjye mwawukoze neza. 
2. Tugende tubiba tubiba Umwami,  niba 
tubabazwa n’abantu barimbuka, 
Amasarura n’imirimo bishize,  nyiri uruzabibu 
azadushimira. 
3. Abakozi mwese muri muruzabibu mururinde 
cyane nk’abazarubazwa 
Nimufate izo ngunzu zona urzabibu Databuja naza 
azabashimira. 
 
 
 
 
 
 
 
5. UZAMPE IHEREZO RYIZA.
1. Uzampe iherezo ryiza nk’iry’abakiranutsi uzampe 
kuraganwa n’abera  
Gakondo wabateguriye,  Mwami sinzagwe munzira 
ntarangije uru rugendo, 
Uzampe iherezo ryiza icyo ni ikifuzo mporana. 
                     R/Kutazagera mu ijuru nicyo gihombo 
gikabije kuzasigara mu iyi si ni 
                        Umubabaro udashira Mwami uzampe 
kurangiza uru rugendo amahoro 
                        Uzampe iherezo ryiza icyo ni ikifuzo 
mporana. 
2. Hari abo twatangiranye iyi nzira ijya mu ijuru 
bamwe ntitukiri kumwe 
Bahisemo kubireka,  ubugingo tuzaragwa 
babuguranye indamu mbi, 
Uzampe iherezo ryiza icyo ni ikifuzo mporana. 
3. Abavuga Mwami Mwami sibo bazabona Imana,  
abakora ibyo yishimira 
Abo nibo bazayibona,  abakerensa agakiza 
bazabona ingaruka mbi, 
Uzampe iherezo ryiza icyo ni ikifuzo mporana.

6. MFITE AMATSIKO.
1. Mfite amatsiko mu mutima yo kubona umwami 
wankunze akaza mu isi akamfira, 
Akababazwa ngo mbabarirwe , yarakubiswe 
umwami wanjye agera n’aho kubambwa 
Ibyo byose iyo mbitekereje umutima urushaho 
gukumbura. 
                             R/Urukumbuzi ruranyishe mbuze 
amababa ngo nguruke  
                               Ariko nzi yuko amaherezo 
umukunzi wanjye nzamubona. 
2. Yasize avuze yuko agiye gutegura aho tuzaba,  
ngo aho ari natwe tuzabeyo, 
Aho tutazongera gutana , tuzabonayo intwari 
zambere zatubanjirije iyi nzira 
Twabikiweyo ibyiza byinshi, tuzabihabwa tugezeyo. 
3. Nzabona Abrahamu na Sara,  nzabona Danieli na 
Dwidi, nzabona Sitefano  
Na Yobu n’izindi ntwari zanesheje. 
“Tuzabonayo intwari zambere zatubanjirije iyi nzira 
twabikiweyo ibyiza 
Byinshi tuzabihabwa tugezeyo.”

7. IYO SI NZIZA.
1. Dore iyi si turimo iri kugenda irenga nubwo 
tuyituyemo ntituzayihoraho 
Hariho indi si nziza yateguriwe abera 
ntamunyabyaha uzayibamo! 
                       R/Iyo si nziza irera n’abazayibamo 
barera  
                          Mbifurije kuzayibamo. 
2. Yemwe abakorera Imana muyikorere nta 
buryarya mudafite kugononwa  
Mwihanganire byose dore shobuja araje,aje 
kubahemba ibihwanye nibyo mwakoze. 
Urwo rurembo tubabwira nta mwijima uzabayo, 
kuko Yesu mfura yo kuzuka ariwe  
Mucyo waho nta rupfu ruzarangwayo kuko 
yarunesheje, ingoma y’abera ntizahanguka.

8. BAKUNDWA.
1. Bakundwa ubu turi abana b’Imana uko tuzasa 
kurahebuje  
Icyo tuzi ni uko uwo mwami wacu niyerekanwa 
tuzasa (*2) nawe (*2) 
Fille: Nubwa umuntu wacu winyuma yasaza ariko 
uko bukeye  
          Uw’imbere aba mushya. 
Garcon: Kubabazwa kwacu 
kw’igihwayihwayikw’akanya ka none  
               Kwakiyongera. 
Tous: Kuturemera ubwiza bw’iteka bw’iteka  ryose 
(*2) 
2. Dufite ubwo butunzi munzabya z’ibumba 
kugirango 
 imbaraga z’Imana Zibe izisumba byose.(*2) 
Filles:Dusa n’abatazwi turi ibirangirire dusa 
n’abakene 
            Dutunbishije benshi. 
Garcons:Dusa n’abapfuye nyamara turiho dusa 
n’abahanwa 
                 Ariko ntidutsindwa. 
Tous:Kugira imbaraga z’Imana zibeizisumba byose. 
3. Bakundwa ubwo dukorana nayo turabinginga 
mudaherwa 
Ubwo buntu kubupfusha ubusa mwihe agaciro 
nk’abakozi 
 b’Imana bagabura ibyayo kukintu cyose. 
Filles: Ubwe yavuze ko azatura muri twe agendere 
muri twe  
            Akorere muri twe. 
Garcons: Tuzamubere ubwoko tumubere amahoro. 
Tous: Bakundwa mwihe agaciro


9. NITWA MUKRISTO.
1. Nitwa mukristo natangiye urugendo kandi urwo 
rugendo  
Ni urugana mu ijuru,  narindemerewe ndushye 
nguye umwuma 
Maze Yesu aramfata anyigisha no gusenga none 
ubu ndamushima 
Ndamushima (*7) 
2. Akimara kumbona akansubiza munzira yampaye 
amagambo yo kuzuka  
N’ubugingo ko ntawe ujya kwa data Atari we 
umujyanye 
anyigisha no gusenga none ubu ndamushima. 
Ndamushima (*7) 
3. yewe ubuze amahoro ngwino umusange uwo 
mwami wankunze 
Nawe arakuruhura araguha amahoro amwe yo 
mumutima 
Akwigishe no gusenga nawe ujye umushima. 
Tumushime (*7) 
                                R/Imibabaro yacu jye nawe izo 
ngorane zacu  
                                    Jye nawe nibyo yacumitiwe. 
 
                                     
10. MVURA Y’UMUHINDO.
1. Hahirwa abafite mu mitima yabo inzira 
zitunganye 
Zijya I siyoni iyo banyuze mu gikombe baka 
bagihindura  
Ahantu heza h’amasoko. 
2. Hahirwa abafite mu mitima yabo inzira 
zitunganye zijya  
I siyoni nink’ibiti byatewe mubikariby’Uwiteka 
bihorana 
Amakakama menshi n’itoto. 
3. Bagenda bagwiza imbaraga buri munsi buri wese 
aboneka 
Mumaso y’Imana isiyoni umutoya muri bo uwo 
azamera nka Dawudi 
Umukuru muri bo azamera nka marayika w’Imana.

11. MVURA Y’UMUHINDO.
1. Hahirwa abafite mu mitima yabo inzira 
zitunganye zijya isiyoni 
Nink’ibiti byatewe mubikari by’Uwiteka bihorana 
amakakama  
Menshi n’itoto. 
2. Hahirwa abafite mu mitima yabo inzira 
zitunganye zijya isiyoni 
Iyo banyuze mugikombe cyitwa baka bagihindura 
ahantu heza h’amasoko. 
3. Bagenda bagwiza imbaraga buri munsi buri wese 
aboneka mumaso y’Imana 
Isiyoni umutoya muri bo uwo azamera nka Dawidi  
umukuru muri bo ninka  
Malayika w’Imana. 
4. Hahirwa abafitemu mitima yabo inzira 
zitunganye zijya isiyoni iyo banyuze 
(Mubukene munzara,  mubupfubyi, mubupfakazi) 
barashima ntacyabatanya 
N’urukundo rw’Uwiteka (*2) 
                             R/Mvura y’umuhindo icyambika 
umugisha buri wese  
                                 Aboneka mumaso y’Imana 
isiyoni. 
 
                                  
 
 
 
11. IYO MBA MFITE AMABABA.
1. Iyo mba mfite amababa  (*3) nkay’abamarayika 
mba ngurutse nkigendera 
Mba ngurutse nkifatira Siyoni. 
2. Pers:Mwami Yesu uzaza ryari ko ubu twese 
twese tugukumbuye kandi 
Amaso aheze mukireren’miruho iraturembeje (*2) 
TOUS:Uzaza ryariko tugukumbuye uzaza ryari ngo 
tuve muri iyi si mbi (*2) 
3. Yewe mwana  wanjye ihangane nziko imiruho 
ikurembeje cyo komera 
Ushikame hari impamvu ituma ntaraza aho mu isi 
ni ukugirango n’abandi 
Bihane bagarukire Imana ariko ntabwo nzemera ko 
umwandu w’abera  
Uguma munsi y’inkoni y’ubutware 
bw’abanyabyaha (*2)

12. SIKO BIZAHORA.
1. Siko bizahorakubamutegereza keretse abava 
mumasezerano ntampamvu 
Siko bizahora kubamwiringira keretse abiringiye 
amagare n’amafarasi. 
2. Kuva ndi umusore nanubu ndashaje sindabona 
umwana w’umukiranutsi  
Aretswe nubwo itangira ryawe ryaba ari rito ariko 
amaherezo yawe wakomera (*2) 
3. Inkoni y’ubutware bw’abadayimoni ntizagumya 
kuba kumwandu w’abizera  
Kugirango abakiranutsi badakora ibibi ahubwo 
bajye bahora bakiranuka (*2) 
                             R/Siko bizahora kubamutegereza 
siko bizahora kubamwiringira (*2)

13. NI UKURI.
                                   R/Ni ukuri uri Imana idashobora 
kubeshya ibyo wavuganye 
                                       Natwe ubu ntakabuza 
uzabisohoza (*2) 
1. Abera bo mu isi nibo mfura Uwiteka Imana yacu 
yishimira, ntakiza nakimwe 
Uwiteka Imana yacu izima abagenda batunganye  
(kandi ijambo yivugiye Ubwayo irikurikirana 
imyaka ibihumbi igashirwa irishohoje) 
Ni ukuri Imana nishimwe. 
2. Si inkovu z’imiringa si ubutunzi si icyubahiro 
uzagaragaza imbere  
Y’Imana si amashu ri menshi sinogukorana 
ubwitang, kubikora wejejwe  
Nicyo cy’ingenzi .Hari icyo ngirango mumenye  
(imirimo umuntu akorana  Urukundo iyo niyo 
azahemberwa) dukorere Imana. 
3. Haracyari  ibyiringiro ko igiti cyamaze gutemwa 
kibasha kongera kigashibuka 
Ahari kurira kubasha kurarira umuntu ariko bwajya 
gucya impudu zikavuga  
Amasezerano y’Imana nubwo yatinda ariko ntabwo 
ajya ahera (amen hareruya).

14. ABAGENZI.
1. TS. Bakundwa turi abagenzi kandi turi abimukira  
S.Iyo umuntu ari umugenzi 
TS.Azirikana cyane aho ari kujya 
S.Iyo umuntu ari umugenzi uri murugendo 
TS.Akumbura cyane iwabo 
                                 R/Nkumbuye cyane kwibera 
Isiyoni nkumbuye cyane kubona Imana 
                                     Nkumbuye kubona 
uwanyitangiye Yesu nkumbuye cyane cyane 
                                     guhozwa amarira (*2) 
2. TS.Iyo umuntu ari murugendo ahura 
n’ibimurushya  
S.Ntidukwiye kugereranya imibabaro yo mu isi 
TS.N’ubwiza tuzabona tugeze iwacu 
S.Ntidukwiye kugereranya ibyago n’amakuba byo 
muri iyoi si  
TS.N’umunezero tuzabona tugeze iwacu. 
3. TS.Nitugera iwacu iyo mu ijuru Yesu 
azatwakirana ibyishimo 
S.Azatubwira ati muruhuke bwoko bwanjye 
TS.Atwambike ikamba ryera ryo kunesha  
S.Azadutambagiza Yerusaremu huu yarimbishijwe 
TS.Muze dutangire kuririmba iz’Isiyoni. 
Tuzanezerwa tuzaririmba,  tuzanezererwa igihugu 
twasezeranijwe hareruya 
Tuzanezerwa tuzaririmba hareruya tuzaririmba 
hareruya amen.

15. MBONYE YUKO IMIBABARO.
1. Mbonye yuko imibabaro dufitemuri iyi si 
itagereranywa n’ubwiza tuzabona 
Mu ijuru ariko uko tuzasa ntabwo kurerekanwa 
icyo nzi nuko Yesu niyerekanwa  
Tuzasa nawe (*2) 
2. Nubwo turuturushywa n’imibabaroyo muri iyi si 
murugendo satani agahora 
 Adutega imitego intego yacu ni ukugera mu ijuru 
ryera aho niho tuzagera 
Tukibera mu mahoro (*2) 
3. None bakundwa turabakumbuza icyo gihugu 
kizaturwamo n’abihanganye 
Iyo mibabaro hasigaye igihe gito umwami Yesu 
akagaruka kujyana itorero 
Rye yacunguje amaraso (*2) 
                                R/Tuzahanagurwa amarira 
twarize tuzaruhuka nitugerayo 
                                    Tuzanezerwa iteka.  
 
                                     
 
 
 
 
 
 
 

16. AMASEZERANO.
1. Amasezerano y’ Uwiteka nubwo yatinda ntajya 
ahera 
                              R/Imanayacu si umuntu ngo 
ibeshye, Imana yacu si umuntu  
                                  Ngo yicuze,  ibyo itatubwiye no 
kubikora izabikora 
                                 ibyoyatwemereyeno kubiduha 
izabiduha (*2) hahaa 
                                 no kubiduha izabiduha. 
2. Siko bizahora mubategereza Imana,  
mubayitegereza  
Ntawe uzakorwa n’isoni (*2) 
                            R/Abava mumasezerano hoo 
ntampamvu (*2) Abo nibo 
                                bazakorwa n’isoniiihi bazakorwa 
n’isoni (*3) 
2. Iyatanzehee umwana wayo,  ikamutanga 
kubwacu ngo atubere 
Igitambo (*2) izabura ite kumuduhana n’ibindi  (*2) 
irinda isezerano 
Ryahayo imyaka ibihumbiiihii imyaka ibihumbi (*3)

Category 3. GUSHIMA
1. TURAGUSHIMA
1. Turagushima Mana turaguhimbaza mukunzi we 
Kubw’ubuntu bwinshi watugiriye ukatugabira 
ukatugabira 
Umurimo eawe ngo tuguheshe icyubahiro 
tukwamamaze  
Muri iyi si dushyire ejuru izina ryawe amanywa 
n’ijoro 
2. Hari impamvu ituma tugushima Mana nuko 
udahwanye 
N’abana b’abantu  Dawidi ati “nari umusore 
ndashaje 
Sindabona umukiranutsi arekwa cyangwa ngo 
urubyaro rwe 
Rusabirize ahubwo ahorana itoto iminsi yo kubaho 
kwe ashima Imana 
 
                               R/Ntacyo twabona twakwitura 
mwami 
                                   Tugutuye imitima yacu ngo 
uyiyobore amanywa n’ijoro 
 Intambwe zacu zibe izo kuyoborwa nawe 
Umwuka wera atubere umuyobozi.

2.  NAGIRIWE UBUNTU.
1. Nagiriwe ubuntu n’Imana mbona inshuti nziza 
cyane  
Uwo ni Yesu mbaraga zanjye turi kumwe 
ndahumurizwa 
Amba hafi buri munsi angenera ibinkwiriye. 
                                 R/iyo nababaye anyuzuza 
umunezero, mbuze uko nigira arampumuriza 
                                   Abakunzi be nimuze  
tumushime, tumurate, twamamaze urukundo rwe. 
2. Iyo nagize ibibazo uwo mukunzi arabisubiza no 
mubyago 
Tiba turi kumwe mbese namugereranya nande , 
uwo mukunzi  
Arakomeye umushikamishije k’umutima 
azamurinda abe amahoro masa. 
3. Inshuti zijya zihinduka, abavandimwe 
barahinduka  
N’ababyeyi bakwihakana ariko Yesu ntabwo ajya 
ahinduka 
Kwiringira Uwiteka bigira umumaro biruta 
kwiringira abakomeye. 
 
 
 
 
 
 

3. IBIHE TWANYUZEMO.
1. Ibihe twanyuzemo byashize,  turashimira 
Uwiteka waturinze 
Si u ko intambara z’urudaca zitateye , ni Uwiteka 
wenyine wahabaye. 
                           R/Ubwo inyanja yihinduranyaga,  
tuba twaratawe I muhengeri 
                              Iyo ataba Uwiteka wahabaye,  
ahacu ntihaba hakibukwa namba. 
2. Benshi bahitanywe n’impanuka (intambara),  
indwara z’ibyorezon’ibindi byinshi 
Kuba turiho ntakiguzi twatanze ni Uwiteka wenyine 
waturinze. 
3. Turagushimiye Mana y’ubuntu,  wagize neza 
uratuzigama  
Twagiye tubona ukuboko kwawe,  niwowe 
waturinze amajta n’amaza.

4. REKA NDIRIMBIRE UMUKUNZI.
1. Reka ndirimbire umukiza wanjye Yesu indirimbo 
yo kumunezeza, 
Ni umwami w’abami ashobora ibidashoboka 
ashimwe. 
                          R/Niwe wazuye Razaro amaze iminsi 
4 mumva, niwe wahagije abantu  
                              Barenga ibihumbi 5,  niwe 
wahumuye Barutimayo wavutse ari impumyi 
                             Ashobora ibidashoboka ashimwe. 
2. Uwo Yesu mubukwe bw’I Kana, yahinduye amazi 
kuba divayi  
Yagendesheje amaguru hejuru y’inyanja, ageze kwa 
Yayilo  
Umwana arazuka. ”Ashobora ibidashoboka 
ashimwe.” 
wowe ufite ibibazo waburiye i gisubizo, 
ubimuzanire arabishoboye, 
uko yari ari ejo nan’ ubu niko ari ashobora 
ibidashoboka ahimbazwe. 
 
                                           
 
 
 
 
 
 
 
4. LA LUMIERE.
1. La lumiere duhagurukijwe no kugushima Mana 
kubw’imirimo wadukoreye 
Muri uyu mwaka ushize,  wagaragaje ukuboko 
kwawe gukomeye Mana  
Akira ishimwe rivuye mu mitima yacu 
                           R/Urakwiriye Yesu tuguhaye 
icyubahiro, Uwiteka nyiringabo habwa 
                             Ikuzo mwami w’abami ukwiye 
ukwiye gushimwa*2 
                             Tuguhaye icyubahiro (mwami 
w’abami ukwiye gushimwa ha ha)*2 
2. Twahuye n’intambara zikomoye,  mugutangira 
uyu murimo wawe 
He he he waradutabaye uraturinda Mana (niyo 
mpamvu tugutaramiye  
Tugushima)*2 
Imbabazi zawe n’urukundo rwawe,  imirimo 
y’amaboko yawe  
Nibyo biduteranije turirimba. 
                           R/2: Nimuze  nshuti zacu 
dushengerere mufatanye natwe gushima Imana 
                                 Dushyire ejuru izina ryayo 
risumba ayandi*2ubuntu bwayo busage  
                                 Muri tweee,  ubuntu bwayo 
busage mubana bayo. 
 
 
 

5. UMWAKA URASHIZE.
1. Dore iminsi irashira,  irahita yihuta ni uko ihita 
benshi bapfa 
Bakagenda batamenye umukiza. 
                       R/Dore umwaka urashize benshi 
barapfuye wowe uriho  
                         Ibaze impamvu wasigaye,  ibaze 
impamvu wasigaye. 
2. Ibuka byinshi Imana yakoze nubwo waba 
warahuye n’intambara 
Ushime Imana kuko tukiri mu isi dufashe igihe mu 
ntambara, 
Dufashe igihe mu ntambara.

6. UMWAKA TURANGIJE.
1. Uyu mwaka turangije wose turashimira Uwiteka 
waturinze 
Si uko intambara z’urudaca zitateye ni uwiteka 
wenyine wahabaye. 
                              R/Ubwo inyanja yihinduranyaga 
tuba twaratawe imuhengeri 
                                  Iyo ataba Uwiteka waturinze 
ahacu ntihaba hakibukwa namba. 
2. Benshi bahitanywe n’impanuka,  indwara 
z’ibyorezo n’ibindi byinshi 
Kuba turiho nta kiguzi twatanze ni Uwiteka 
wenyine wahabaye. 
3. Turagushimiye Mana y;  ubuntu wagize neza 
uratuzigama  
Twagiye tubona ukuboko kwawe niwowe 
waturinze amajya n’amaza.

7. HALLELUYA.
1. Halleluya nimushime uhoraro yuko ari mwiza,  
yuko imbabazi ze ziriho 
Iteka ryose n iwe ukura aboroheje mumukungugu,  
shyira hejuru abaciye bugufi 
Kugirango abicaranye n’ abakomeye nimushime 
Uhoraho yuko ari mwiza. 
2. Iyo ataba wowe uwiteka jye nari kuba he?  Mba 
naribagiranye muri iyi si y’abazima 
Untabara mugihe cyo kugotwa uraboneka Mana 
ukiranuka.*2 
3. Uhoraho we uri mwiza kubagutegereje nanjye 
nzigumira mubikari byawe Mana 
Yanjye umutima wanjye uzishimira kubana nawe 
iminsi yose nzaba munzu yawe 
Sinzarambirwa kubwira abatuye isi ineza yawe. 
                               R/Nanjye sinzareka kuvuga 
ishimwe ry’imirimo wankoreye  
                                  Nzajya nguhimbaza,  nzajya 
nkuririmba nzagutambira 
                                     iminsi yose Nkiriho.*2 
 
                      
 
 
 
 
 
 
March 8, 2016 [ IGITABO CY’INDIRIMBO ZA  CHORALE LA LUMIERE                 (  ZABURI  147:1 ;YOBU 8 :7)] 
 
17 BY 
Aimable HA

8. IMBARAGA.
1. Imbaraga, imbaraga, imbaraga z’Imana ndavuga 
imbaraga z’Imana  
Ndavuga gukomera kw’Imana,  ndavuga gutabara 
kw’Imana. 
Hari imbaraga zidasanzwe z’Imana hari ukunesha 
kudasanzwe kw’Imana 
Imana nyamana iratabara kurugamba. 
Yatunguye Gidiyoni asekura ingano yihisha 
abamidiyani iramubwira 
Iti Gidiyoni weee genda genda ukw’imbaraga za we 
zingana. 
Garcons: Uzanesha (*3) 
Tous: abamidiyani. 
R/Mbega imbaraga z’Imana mbega gukomera 
kw’Imana. 
2. Yatunguye na Yosuwa kurugamba abona 
umugaboarabaza ati yewe muntu  
Uri uwo mubacu cg se uri uwo mubabisha ati oya 
sindi uwo mubabisha 
Ndiumugaba w’izo mu ijuru manuwe no gutabara,  
abagenda imbere baranesha. 
3. Yatunguye Marodekayi n’Abayuda babibonye 
baratangara babwira  
Hamani, Hamani Hamani wehe wibeshya 
kugambanira abayuda ni  
Ukutamenya ibabamo. Ni inyembaraga , ni 
inyembaraga weeeheee. 
 
                         
9. MANA URAKOMEYE.
                    R/Mana wahozeho Mana uzahoraho 
Mana urakomeye he he (*2) 
1. Watabaye Islaheri ubambutsa inyanja itukura 
abanyegiputa babigerageje  
Bararengerwa, ifarasi n’uwo ihetse wabiroshye 
munyanja 
Uwiteka yaranesheje bitangaje he he (*2) 
2. Mana iyo ukinguye ntawe ubasha gukinga,  iyo 
uvuze biraba wategeka  
Bigakorwa ntakikunanira mugihe cyashyizweho 
wibuka isezerano ryawe 
Ibihe igihumbi hi hi (*2). 
3. Watabaye Dawudi ahangura Goriyati amunesha 
mu izina ry’Uwiteka 
Imana nyiringabo , Sawuriyishe ibihumbi,  Dawudi 
yica inzovu  
Uwiteka waraneshereje bitangaje he he (*2).

10. CHORAS.
1. Ninde uhwanye nawe Mana yanjye eh mwungeri 
wanjye ko narebye hose  
Nkabura uwo nagereranya nawe  mubo mu isi bose 
ntanumwe uzigera ahwana 
Nawe mubyo waremye byose izina ryawe riri 
hejuru. 
2. Ninde uhwanye nawe Mana yanjye ehMwungeri 
wanjye ko imirimo iteye 
Ubwoba iyo wankoreye  niyo wansezeranyije 
kunkorera jyewe ko bindenze 
Aho wankuye jyewe umwana wawe nzajya mpora 
ngushima. 
3. Shimwa shimwa Mana waremye ijuru n’iyi si 
yacu amahanga yose  
Ashime izina ryawe Mucunguzi ducishijwe bugufi 
dore wowe  
Ushyirwe hejuru. 
 
                                         
 
 
 
 
 
 
 
 
 

11. IMANA YACU.
              R/Imana yacu irumva , irera  kandi 
irakomeye, Imana yacu irafatika 
                   Kandi iranaboneka irera irera Imana yacu 
irera (*2) 
1. Mbese  ntimwumvise ibitangaza yakoreye 
abisiraheri ubwo bambukaga  
N’amaguru inyanja iri imbere yabo mbese 
byarashobokaga ko amazi yigabanyamo  
Agahagarara hamwe kandi ari ntawe uyafashe 
ndetse akibwiriza gusubirana  
Ari uko bose bambutse (*2) 
2. Mbese  ntimwumvise ibitangaza yakoreye 
Danyeri na babasore uko ari batatu 
Bahagaze ku itanura Uwiteka aramanuka 
ahagararana nabo abanyamahanga nabo 
bahagazebashungera abanyamahanga babaregaga 
ubwo bataha itanura (*2) 
3. Mbese  Ni iki kiguteye guhagarika umutima 
ndetse ukaba wahisemo kwisubirira inyuma  
Ibyo ubona bikugoye nk’imisozi irumbaraye 
bikagutera kwiheba ntutuze no mu mutima  
Ibyo bihindutse nk’ibibaya niko Uwiteka abivuze 
(*2) 
             “Mu isi no mu ijuru ntazina nk’irya Yesu 
ntarindi ryampumuriza  
                 Nkiry’uwatubambiwe

12. IBYIZA.
1. Ibyiza Uwiteka yangiriye byose yemwe 
ndabimwitura ikimbese bene data  
Nzakira igikombe cy’agakiza nzambaza izina 
ry’Uwiteka Imana data. 
2. Iyo ntiringira kubona agakiza k’ Imana data mba 
nararabye muri iyi si  
Y’abazima Uwiteka ni imbaraga z’abantu biwe 
yemwe nigihome  
Cy’uwo yasize. 
3. Uwiteka nzagushimira mumoko yose yemwe 
nzakuririmbira ishimwe 
Mumahanga kuko imbabazi zawe ari ndende 
zisumba ijuru n’umurava 
Wawe ugera mubicu. 
                           R/Uwiteka niwe ubohora imbohe zo 
mumutima agahumura 
                               yemesha n’ abahetamye, imfubyi 
n’abapfakazi niwe ubabeshaho 
                                Iteka akagirira neza ab’imitima 
imenetse. 
 
                                         

12. BAKOBWA.
                               R/Nimushime Uhoraho 
nimushime uwiteka yuko ari mwiza hahaha (*2) 
1. Uwiteka arakomeye, Uwiteka agira neza ni 
inyamibwa ibyaremwe byose  
Uwiteka atubereye mwiza. 
2. Nkumutako wo mubiti byo mu ishyamba niko 
uwo mukunzi ameze mubahungu 
Nicaye mugicucu cye kinezeza amatunda yiwe 
arandyohera (*2) 
3. Nashatse uwo umutima wanjye ukunda nifuzaga 
kumureba mumaso mbese  
Mwe abarinzi b’umudugudu mwabonye uwo 
umutima wanjye ushaka? 
Garcons: Mwabakobwa b’Iyeruzaremu mwe 
mbarahije amasirabo n’impara  
                 Ntimukangure uwo mukunzi wanjye 
kugeza igihe yumva abyishakiye. 
Filles: Ijwi ry’uumukunzi wanjye riraje asimbuka 
mumpinga z’imisozi 
           Umukunzi wanjye ameze nk’isirabo cg se 
umucanzogera w’impara 
           Ameze nk’amahema y’abakedari cg se 
umucanzogera w’impara (*2) 
 
                                    
 
13. IBIZIGIRA.
1. Nimushime uhoraho yuko ari mwiza yuko 
imbabazi ze zamaho  
Ibihe bidashira. 
                         R/Indushyi niwe uziruhura akenura 
abakene yita 
                              Kumitima imenetse. 
2. nimushime Uhoraho kubw’imbaraga ze iyo avuze 
biraba  
Yategeka bigakomera. 
                     R/Niwe ntwari muntambara n’umugabo 
w’ibigango 
                        Ibizigira bye biteye ubwoba. 
3. Nimushime uhoraho kubw’urukundo rwe niwe 
ushyira  
Hejuru abamenye izina rye. 
                     R/Niwe ujya akura kucyavu akicazanya 
n’abami  
                         Niwe ugirira neza abantu biwe.

14. MANA NDAGUSHIMIYE.
1. Mana ndagushimiye ndaguhimbaje 
kubw’imirimo ukora iratangaje 
Warinze ubugingo ndetse n’umubiri ntakindi 
naguha Mana yanjye 
Akira ishimwe (*2) 
2. wandwaniye intambara jye ntashobora ubwo 
imyambi ya Satani  
Yari inyugarije Maqna warantabaye umbera byose 
ntakindi naguha 
Mana yanjye akira ishimwe (*2) 
3. Mvze ibyawe Mana ntibyarangira kubw’imirimo 
ukora iratangaje 
Uhereye kera uko wahoze ntakindi naguha Mana 
yanjye  
Akira ishimwe (*2) 
                                  R/Hari ibyahigaga ubugingo 
bitibagiwe n’umubiri 
                                     Intambara zari nyinshi cyane 
ariko Mana waratabaye (*2)

15. UKURA KUCYAVU.
                                   R/Ukura kucyavu Mana  (*3)we 
he akira ishimwe ryawe 
                                        Nibutse gukomera kwawe 
nibutse gutabara kwawe ukura 
                                         kucyavu Mana we he akira 
ishimwe ryawe (*2) 
1. Watabaye Marodekayi nimpamo yari umuzamu 
bamucira mu maso Mana we 
Kandi ari umukozi wawe umunsi umwe igihe 
ntarengwa umwami abura ibitotsi  
Kubw’uwo mugabo Mana we he ukunda abakozi 
bawe nukuri Hamani umutware 
 Atambagiza Morodekayibati uwo umwami akunze 
kubaha bajye babugenza batya. 
2. Dawidi mwene Yesaya nawe yari umushumba 
aragira intama Mana we umugabira 
Ubwami, Yosuwa mwene Nuni yari muto mubandi 
umukura kucyavu Mana we he  
Umugabiza ab’Iyeriko nshuti mawe mwene data 
nimuze musange Uwiteka abakure 
Kucyavu nimpamo arabagirira ibambe. 
 
                                      
 
 
 
16. MANA YACU URI NZIZA.
1. Mana yacu uri nziza Mana yacu ugira neza 
nzahora nguhimbaza 
Nzahora ngusingiza,  nzahora nguhimbaza nzahora 
nguhimbaza. 
2. Dawidi we yarakwitegereje aravuga ati Mana 
yacu uriya, Abayisiraheri  
Ubambutsa inyanja itukura bageze hakurya 
baragusingiza. 
3. Niwowe watangije umurimo hagati muri twe 
uzawusohoza nubwo 
Itangira ryacu ryari rito ariko amaherezo yacu 
tuzunguka Mana yacu 
Uri nziza, Mana yacuugira neza. 
 
                                
 
 
Category 4. KWIZERA
1. AMAVUTA
1. Uwiteka we tega ugutwi wumve gusenga 
kw’abana bawe 
Ubu turi kurugamba turasaba imbaraga n’amavuta 
y’umwuka wera. 
2. Icyatumye Petero ashobora kuzura Tabita na cya 
kimuga cyo ku 
Irembo ryiza kigakira , agashobozwa guhamyaYesu 
ashize amanga 
Ni uko yari afite ayo mavuta y’umwuka wera. 
                  R/Abayobozi tubasabiye ayo mavuta, 
                     Abaririmbyi dukwiriye ayo mavuta, 
                     Abanyamasengesho bakeneye ayo 
mavuta, 
                     Itorero ryose rikwiriye ayo mavuta, 
                     Kuko arayo umumaro ukomeye mwuyu 
murimo. 
 
 
 
 
 
2. ABANYAMUGISHA
1. Baraki yashatse kuvuma aba islaheri kuko 
yariyumvise amateka yabo 
Asanga baramu aramubwira ati”mvumira buriya 
bwoko nzabatsinde 
Uwo uhaye umugisha arawuhabwa  koko uwo 
uvumye ahinduka ikivume 
(None mvumira bariya bisilaheri)*2 
                            R/Turi abanyamugisha 
twaratoranijwe n’uzashaka kutuvuma 
                                Azatwirukaho agwe ruhabo 
ataradufata, tuzava muri iyi si 
                                Tukiri abanyamugisha  (kuko azi 
n’amazina yacu uwo mwami)*2 
2. Baraki abwira Baramu ati ngaho bavume kandi 
nubavuma nzagushyira hejuru 
Baramu agerageje biramunanira maze Uwiteka 
aramubwira have have 
Baramu have have Baramu we mbese ninde ubasha 
kuvuma uwo ntavumye 
(Erega buriya bwoko nabuhaye umugisha)*2 
3. None nshuti waba unanijwe n’ibibazo by’isi 
cyangwa intambara 
Tuza umutima niba Imanaikwishimira nta narimwe 
uzakorwa n’isoni 
Ibikwasamiye ibibumbye iminwa aho uzajya hose 
Imana izakujya imbere 
Washyizweho ikimenyetso cy’abanyamugisha 
erega washyizweho  
Ikimenyetso cy’abanyamugisha. 
      Cholas: Ninde ubasha kuvuma uwo Imana 
itavumye.

3. GUKORERA IMANA.
1. Gukorera Imana ntagihombo kirimo ubikore 
neza maze wirebere 
Bikore ukiranuka kandi murukundo urebe ngo 
uragwiza imigisha myinshi 
Itagira akagero (Na Hezekiya kubw’imirimo myiza 
yongerewe imyaka yo kurama)*2 
2. Gukora imirimo y’Imana mu rukundo bigira 
umumaro mwinshi cyane 
Tabiti yarabibonye ubwo yari akuwe mu mubiri 
abapfakazi n’impfubyi 
Baramuririra (bati yatudoderaga amakanzu meza 
Imana irabyumva iramuzura. 
3. Imana twizeye ni Imana nya Mana abayikorera 
ntabwo izigera ibambura 
Izabahemba neza kuko ibabereye maso;  ijisho 
ryayo rizahora kuri bo 
Umva mwene Data neza ntawakoreye Imana 
uzikorera amaboko. 
                              R/Ntizaduta ntizaduhana izahora 
iduhetse kumugongo wayo 
                                Kubayikorera ntaburyarya 
ibakubira inshuro ijana izabaha n’ubugingo. 
 
                         
 
4. UMUNTU MURI IYI SI.
1. Umuntu muri iyi si afashe igihe mu ntambara 
n’iminsi ye yose 
Ni nk’ukorera ibihembo,  mwe abari muri iyi si yose 
muvugirize 
Uwiteka impundu,  muze mu maso ye muririmba 
tumukorere tunezerewe. 
2. Abasore b’imigenda bazacogora bananirwe,  
abiringiye Imana 
Basubizwemo integer nshya , bazatumbagira mu 
kirere bagurukishe amababa 
Nk’ibisiga, bazirukanke be kunanirwa bakore 
iby’ubutwari. 
3. Imana niyo iha integer abananiwe bose,  
utabashije nawe imwongereramo 
Integer nshya, mbese Imana yacu twayigereranya 
nande? 
Nawe va mugihirahiro yiteguye kugusubiza. 
                         R/Mbega umunezero mwinshi,  
mbega imigisha myinshi kubahisemo neza, 
                             Bakiringira Imana  yabaciye 
nk’imanzi mu kiganza nta narimwe bazarekwa. 
 
 
 

5. NI UKURI
                                 R/Ni ukuri uri Imana idashobora 
kubeshya ibyo wavuganye natwe  
                                     Nta kabuza uzabisohoza. 
1.  Abera bo mu isi nibo mf ura Uwiteka Imana 
yacuyishimira 
Ntakiza nakimwe Uwiteka Imana izima abagenda 
batunganye 
Kandi ijambo yivugiye ubwayo irikurikirana imyaka 
igihumbi 
Igashirwa irishohoje, Amen haleluya. 
2. SIinkovu z’ imiringa si ubutunzi si icyubahiro 
uzagaragaza imbere y’Imana 
Si amashuri menshi,  si no gukorana ubwitange  
kubikora wejejwe nicyo cy’ingenzi 
Hari icyo ngirango mumenye imirimo umuntu 
akorana urukundo, 
iyo niyo umuntu azahemberwa,  dukorere Imana 
dutinya. 
3. Haracyari ibyiringiro ko igiti cyamaze gutemwa 
kibasha kongera kigashibuka 
Ahari kurira kubasha kwarira umuntu ariko bwajya 
gucya impundu zikavuga, 
Amasezerano y’Imana nubwo yatinda ariko ntajya 
ahera.

6. PANTEKOTE.
1. Kumusi wa Pantekote abigishwa b’Umwami Yesu 
bari bahuje umutima 
Bari bari mu mwanya umwe bari gusenga 
haboneka indimi zigabanije 
Zisa n’umuriro ugurumana,  buri rurimi rukajya 
rujya kuri buri muntu wese. 
2. Ako kanya amateka arahinduka batangira 
gukorera Imana uwamaze  
Kwakira izo mbaraga ntaba agitinya guhamya Yesu. 
Petero yuzuye imbaraga z’umwuka ati Yesu umwe 
mwabambye  
Mukamwica niwe udukoresheje iby’ubutwari turi 
kubona uyu munsi. 
3. Yesu ajya kujya mu ijuru yadusigiye isezerano ati 
simbasize nk’imfubyi 
Nzaboherereza umufasha iryo sezerano yarisohoje 
kur’urya munsi wa  
Pantekote twahawe umwuka wera bakristo uwo 
muriro ntukazime

7. UBUKWE = UWITEKA
1. Uwiteka Imana yaremye ijuru n’isi arema 
inyamaswa, ibimera n’ibindi 
Kuko yabonaga ari byiza,  imaze kurema ibyo byose 
iti tureme n’umuntu 
Mu ishusho yacu ase natwe ategeke ibyo mu isi 
byose. 
                             R/Imaze kurema uwo nugabo iti 
sibyiza ko aba wenyine 
                                Imusinziriza ubuticura mumbavu 
ze ikuramo urubavu rumwe  
                                Imuremera umufasha 
umukwiriye. 
2. Uwo mugabo akangutse amubonye 
aramwishimira ati uyu ni igufwa  
Ryo mu magufwa yanjye kandi ni akara ko mumara 
yanjyenzamukunda 
Azitwa umugore kuko yakuwe mu mugabo nicyo 
gituma umugabo 
Asiga se na nyina akibanira n’umugore we 
akaramata. 
             .Yewe mugabo ujye ukunda umugore wawe; 
              Umenye yuko ariwe Imana igutoranirije. 
            .Ujye umuba hafiumukuyakuye muri byose; 
             Ni ukuri Imana izabigushoboza. 
            .Nawe mugore jya wubaha umugabo wawe; 
             Umugandukire haba kumanywa na nijoro. 
            .Ujye unyurwa nawe uko mwaba mubayeho 
kose; 
             Nugenza utyo Imanaizabiguhembera.

8. MUGIRE UMWETE WO KWEZWA.
1. Mugire umwete wo kwezwa,  mubane amahoro 
umuntu kurwe ruhande 
Arwanire gukiranuka musabire abera bose 
mutarobanuye, iherezo  
Rya byose rigeze bugufi. 
                              R/Unesha azambikwa umwambaro 
wera azagaburirwa manu yahishwe 
                                 Kandi azabona Imana amaso ku 
maso. 
2. Mugendane ingeso nziza nk’abana b’umucyo,  
murobanure ibishimwa 
Bikurwe mubigawa kandi kukintu cyose mwiheshe 
agaciro, 
Amatabaza yanyu ahoree amurika. 
3. Musenge ubudasiba kumanywa na nijoro kandi 
muneshe ibyaha mwambaye  
Gukiranuka kuko Uwiteka arera azabana n’abera 
ntacyanduye cyose 
Kizagera ahera. 
 
 
 
                                  
9. NOEL ABAHANUZI.
1. Abahanuzi bari barahanuye bati dore umwari 
azasama inda 
Kandi azabyara umwana w’umuhungu uzacungura 
abo mu isi bose. 
                    R/Emanweli Imana iri kumwe natwe , 
umukiza yatuvukiye. 
                       Emanweli Imana iri kumwe natwe 
umwami w’abami aje  
                      Kwima ingoma. 
2. Abanyabwenge bajya kwa Herodi barababaza 
bati umwana ari hehe 
Baje bose bayobowe n’inyenyeri bazanye amaturo 
y’amashimwe. 
3. Uwo mwami yicishije bugufi yemera kuvukira 
mukiraro, bamuryamisha 
 mu muvure w’inka uko niko yaje anshaka. 
 
 
 
10. DORE IMINSI.
1. Dore iminsi dusohoyemo abantu babaye ba 
nyamwigendaho 
Bataye Imana bayoboka ibibi muri ibyo byose 
ntamumaro bibagirira. 
                            R/Kuko ntakintu nakimwe wazanye 
ku isi 
                                niko ntacyo ubasha kuyikuramo. 
G.Mushake ubwami bw’Imana no gukiranuka 
kwayo. 
Twese: Ibindi byose muzabyongererwaho. 
2. Ubaha Imana uyizere ugwe neza ugire urukundo 
wihangane 
Ugire ubwenge urushe Salomo wari umuhanga 
muri byose. 
3. Gut: Umva mwene data va muby’isi ukurikire 
umwami Yesu 
Uzabona ibyiza utigeze ubona wasezeranijwe na 
Yesu. (*2)

11. MUTWARE INTWARO.
1. Mutware intwaro zose z’Imana mubashe 
guhagarara ku munsi mubi 
Mudatsinzwe n’ uburiganya bwa Satani mutware 
inwaro zose z’Imana.(*2) 
2. Mutware kwizera nk’ingabo ibakingira mutware 
n’inkota ariyo jambo ry’Imana 
Mwambare ingofero ibabere agakiza mutware 
intwaro zose z’Imana.(*2) 
3. Dufata mpiri ibitekerezwa mumitima 
tukabigomororera uwo mwami wacu 
Dukubita hasi ibihome bya Satani nibyishyira 
hejuru kurwanya Imana. (*2) 
                                   R/Nicyo gituma tutazatinya 
nicyo gituma nzahora nemye 
                                       Nicyo gituma nzahora nesha 
nzahora nesha iteka  
                                       Nzahora nesha ha (*2) 
 

12. HAHIRWA.
1. Hahirwa udakurikiza imigambi y’ababi 
ntahagarare muy’abanyabyaha 
Kandi ntiyicarane n’abakobanyi yishimira 
amategeko y’Uwiteka  
Uwo azahwana n’igiti cyatewe hafi y’umugezi (*20) 
2. Hahirwa abakene mu mutima yabo ubwami bwo 
mu ijuru kuko 
Ari ubwabo kandi abashavura bazahozwa abagwa 
neza bazaragwa 
Isi nshya nabo bazahwana n’igiti cyatewe hafi 
y’umugezi (*2) 
3. Hahirwa abanyembabazi bazazigirirwa b’imitima 
iboneye bazabona 
Imana kandi abakiranura bazitwa ab’Imana 
bashimira amategeko 
Y’Uwiteka nabo bazahwana n’igiti cyatewe hafi 
y’umugezi (*2)

13. NTAMAHORO.
                        R/Ntamahoro y’abanyabyaha (*2)  
niko uhoraho avuga ha yeruye (*2) 
1. Nabajije uwitwa Maraki ndamubara 
kubanyabyaha ansubiza ampakanira  
Ati kurayo amaso ati genda ubabwire yuko hazaba 
umunsi umwe uzabaho nyabashyire  he 
Ntibazongera kwibukwa (*2) 
2. Naganiriye n’abaririmbyi kumahoro  yo 
banyabyaha nibabandanye binyegeze 
Nibabandanye binyegeze nyamara hazabaho 
umunsi umwe uzabashikako batabizi aho  
Umwimbuzi azaba aje ntibazabona icyo bireguza  
(*2) 
3. Yewe muntu uri mu ishengero ukabandanya 
kwisitaza iyo ndishyiy’umubabaro  
Ho uzoyishyura iki mugenzi wanjye ingendo 
ingendo nyinshi zarateguwe kandi ubutumwa  
Nabwo buraza iyo kike y’abana b’Imana uzoyikura 
he mw’isi (*2)

14. MWISIRAHERI.
1. Mwisiraheri hari umwami witwaga Sawuli 
yajyaga aterwa n’imyuka mibi  
Dawidi akaririmba,  Dawidi agasenga Dawidi  (*3) 
Dawidi akaririmba  
Dawidi agasenga. 
Filles: Harimo umugabo  Garcons: Umugabo 
ukomeye umugabo w’igihangange, w’igihangange 
Goriyati yasuzuguraga Imana agatuka Imana 
ningabo zayo Dawidi 
Aramureba arasenga ati Mana nyirijuru wehehe 
mungabize  
Umungabize umungabize. 
2. Maze Dawidi aragenda abwira  Sswuri mwami 
nyaguhora kungoma 
Nyemerera ngende ngere kurugamba ndwane 
n’umugabo nabonye  
Atuka Imana n’ingabo zayo.  
Filles: Narwanye n’intare mu ishyamba nyaka 
intama.Ndwana n’idubu mu  
           Ishyamba nyaka intama none mu izina 
ry’Uwiteka ndamunesha ndamunesha 
           Uwo Goriati ati: 
Garcons: Yewe sha ngwino nkubagire ibisiga 
n’inyamaswa zo mu ishyamba maze  
                 Dawudi agenda yiruka arwana na Goriyati 
afata akagozi akora mu mvumba afata  
                 Akabuye nuko aramwegera arazunguza 
arazunguza (*2)pa!maze iryo buye ryica  
                 Goriyati Dawidi araririmba Dawidi 
araririmba. 
March 8, 2016 [ IGITABO CY’INDIRIMBO ZA  CHORALE LA LUMIERE                 (  ZABURI  147:1 ;YOBU 8 :7)] 
 
26 BY 
Aimable HA

15. ISIRAHERI.
                              R/Isiraheri (*2)  wowe nakunze 
nagusezeranije ko ndi Imana yawe (*2) 
1. Mwanzu ya Yakobo mwe namwe abarokotse bo 
munzu ya Islaheri mwese abo nahetse 
Mukiri munda  nkabaterura mukivuka nkabageza 
muzabukuru yemwe muzarinda imvi ziba  
Uruyenzinkibahetse ninjye wabaremye kandi 
nzabaha umugisha. 
2. Nasezeranye na Abrahamu ko nza bana nawe 
nsezerana na Isaka ko nzabana nawe  
Nsezerana na Yakobo ko nzabana nawe,  
mbasezeranije ko ndi Imana yanyu  
Ninjye wabaremye kandi nzabaha umugisha. (*2) 
3. Impumyi nzaziyobora inzira zitazi nzinyuze 
mutuyira citigeze kumenya  
Umwijima nzawuhindira umucyo imbere yazo 
n’ahantu hagoramye yemwe  
Nzahagorora, n’ahantu hagoramye yemwe 
nzahagorora. (*2)

16. WAMWANZI WANJYE WE.
1. Wamwanzi wanjye we winyishima hejuru 
ningwa nzabyutswa n’umukiza  
Wamwanzi wanjye we winyishima hejuruningwa 
nzabyutswa n’uwiteka (*2) 
2. Muntege nke zacu no mukugeragezwa aho niho 
uwiteka aturengera 
 muntege nkeya zacu no mukugeragezwa aho niho 
uwiteka adutabara (*2) 
3. Nubwo ibyago n’amaku baby’umukiranutsi ari 
byinshi Uwiteka aramuramira 
Akamuka nubwo ibyago n’amakuba 
by’umukiranutsi ari byinshi aramuramira 
Amurengera. 
4. Shimwa muremyi wanjye kuko wankunze 
ukankura mubyaha ntakwiriye 
Shimwa Mana yanjye kuko wankunze ugatanga 
umwana akamfira (*2) 
                             R/Yadusezeranije isezerano ryo 
kumukorera mo kumukurikira 
                                Abamukoreye ntibazakorwa 
n’isonibafite ingororano mu bwami 
                                 Bwo mu ijuru (*2) 
 
                                        
 
 
17. BENE RASHELI.
1. Yemwe yemwe bene Rasheli ariko mwe murazira 
iki? ko mwonkejwe nk’abandi  
Bana ariko murazira iki?  mwagaburiwe imbuto 
nziza ariko murazira iki? 
Umufasha yabanye namwe ariko ntimubyitaho 
none mwampindukiye  
Ingwingiri mwanga gukura. 
2. Ko mwisiganwa wasiganwaga n’abanyamaguru 
bakagusiga unaniwe  
Ucitse integer kwisiganwa ryawe n’amafarashi ko 
ubu ariryo rije  
Mbese urumva uzabasha ute guhabwa 
ibyasezeranijwe (*2) 
3. Mbese kuki uri kumera imvi z’urutarutaru ukaba 
umeze nk’umutsima  
Uhiye uruhande ugiye gutungurwa uvunagurike 
utiteguye none mugenzi 
Gira ushake Uwiteka bigishoboka ko abonwa (*2) 
                             R/None garuka mugenzi wumvire 
umwuka kandi  
                                 Kumiburo y’Uwiteka , Uwiteka 
nawe  
                                 Yiteguye kukubabarira (*2)

18. UMUBIBYI.
1. Hariho umubibyi wasohoye imbuto abiba 
amasaka mumurima we  
Maze umwanzi amuca inyuma agenda mumurima 
we abibamo urukungu. 
2. Maze abakozi be babonamo urukungu  babwira 
shebuja bati “amasaka yawe 
 yameranye n’urukungu reka tujye kururandura  
(*2) 
3. Shebuja arabasubiza ati bireke bikurane bigeze 
isarura nzabwira abasaruzi  
Banjye bampunikire amasaka bayashyire mukigega 
maze urukungu, urukungu 
Nzarutwika maze urukungu, urukungu nzarutwika. 
                          R/Yewe ubuze amahoro ugeragezwa 
na satani saba Imana  
                               Iguhe imbaraga twebwe ho 
turajya mu ijuru  
                            Satani, Satani azajya mu muriro (*2) 
 
 
 
                                
 
 
 
19. MBESE MWANA WANJYE.
1. Mbese mwana wanjye urarizwa niki?  Mbese 
mwana wanjye nikikikubabaje 
Mbase mwana wanjye urarizwa niki? mwana 
wanjye humura ndi kumwe nawe 
Nagutangiye mwegiputa ho incugu Etiyopiya 
n’Isaba nahatanze kubwawe kuko  
Wambereye inkoramutima kandi ukaba uwo 
kubahwa nanjye nkagukunda.   
2. yewe mwana wanjye tega amatwi nkubwire 
ninjye wariho kera kandi ninjye 
Uzahoraho tuza uceceke nzakurinda nkuragire kuko 
wangiriyeho umugisha  
Nko kumenya izina umubyeyi abasha kwibagirwa 
uwo yabyaye ariko njye 
 Sinzakwibagirwa nahato umubyeyi abasha 
kwibagirwa uwo yabyaye ariko 
Njye sinzakwibagirwa nahato. 
3. Mwana wanjye ba maso kandi ukiranuke kuko 
ibihe biri imbere biruhije  
Cyane ambara intwaro zose hatabuzemo nimwe 
kandi urusheho kuba imbere  
Yanjye urusheho gusenga abaguhagurukiye 
nzabatatanyiriza imbere yawe  
Bakorwe n’isoni kuko nirahiriye ko ntayindi mana 
izigera iboho keretse  
Jye Uwiteka. 
                             R/Witinya (*3) kuko nakumenye 
izina witinya (*3) 
                                  Kuko ndi kumwe nawe.

20. EFURAHIMU.
1. Mwana wanjye efurahimu ko wambereye 
umutsima uhiye uruhande 
Rumwe imvi z’urutarutaru ko wamaze kuzimera 
abanyamahanga bawe  
Bakumazemo imbaraga (*2) 
2. Nari narakugize cyane uruzabibu rwiza rwose 
umubyare utunganye  
Wahindutse nose kuki wimuye Uwiteka ubwo 
yakuyoboraga inzira igutunganiye. 
3. Abakomeye bo mu isi ntabwo ari abo 
kwiringirwa cg se umwana w’umuntu  
Utabonerwamo agakiza ahubwo mwiringire 
Uwiteka nyiringabo Uwera igitare  
Cyacu niwe ushobora byose (*2) 
                                             R/Rega nimungarukire 
najye ndabagarukira va hagati 
                                                 Y’aba bandi nanjye 
nzabakira nzababera Uwiteka mwebweho 
                                                  Muzambera abakobwa 
n’abahungu niko Uwiteka avuze. 
 
 
 
21. NAGEZE KURUGAMBA.
1. Nageze kurugamba imyambi iba myinshi 
amacumu aramfata  
Yesu urantabara (*2) 
2. Itorero ry’ Imana riri kurugamba kurwana ni 
ukwawe izina rya 
Yesu riranesha (*2) 
3. None mukristo uri hano menya ko satani arakaye 
shishoza imirimo 
Yawe atagutwara ubugingo (*2) 
                                 R/Oh Mwami Ysu nkunda 
ukemera ko nza imbere yawe 
                                     Jyewe ndi umunyabyaha 
umbabarire (*2)

22. NKUKO WAFASHAGA BA
SOGOKURU. 
1. Nkuko wafashaga ba sogokuruza natwe abe 
ariko udufasha Mwami 
Kuko insesezi irasesera ishaka gusesa amasezerano 
twagiranye nawe 
Mana turengere (*2) 
2. Dore abari bafite ingabo muntoki bazifashije hasi 
Mwami none dore 
 Imyambi y’ umubisha irabahuranya urwungikanye 
ikabagusha  
Mana dutabare (*2)  
3. Yemwe abari kuri urwo rugamba haha 
rwatangijwe na Yesu Mwami 
Wacu mufate intwaro turwanirire itorero tugize 
umuryango umwe  
Twunze ubumwe twese duhuje umutima Yesu 
azatugororera (*2) 
                            R/Yemwe yemwe bagaratiya mwe 
b’abapfapfa ninde 
                                 Wabaroze mwatangije 
iby’umwuka mwakundaga mu mwuka 
                                  none muherutse iby’umubiri 
nimwisubireho (*2)

23. GUKORA HAKIRI KUMANYWA.
1. Nkwiriye gukora umurimo w’uwantumye hakiri 
kumanywa kuko nibumara kwira 
N’igihe umuntu atabasha gukora (*2) 
2. Umwami wacu Yesu we yasize avuze ibi bihe 
turimo ko inzangano zizagwira 
Inzara, intambara ndetse n’ibyorezo (*2) 
3. Ibi bihe turimo ni ibihe bikomeye kandi biruhije 
kuko umwanzi Satani  
Ariho arakara mumayobera ye (*2) 
                            R/Bagenzi tujyanye munsobanurire 
ibi bihe turimo mbese  
                                 Hasigaye iki?  niki kimwe gusa 
impanda tukabona umwami 
                                agarutse kutujyana mu ijuru kwa 
Data (*2)

24. GUTABARWA KURI HAFI.
                              R/Gutabarwa burya kuri hafi 
gutabarwa burya kuri hafi ibuka (*3) 
1. Ibuka Marodekayibamugambaniye nubwoko 
bwabo ariko ijuru ryari ryatabaye  
Bibuza umwami kubona ibitotsi bamuzanira igitabo 
cy’ubucurabwenge nuko  
Morodekayi atambagizwa umurwa (*2) 
2. Ibuka Hana munzu y’Imana yamaranye 
umubabaro igihe kirekire ariko ijuru 
Ryari ryatabaye nuko Hana abona Samweli ati:  
ihembe ryanjye rishinzwe hejuru  
Uwari ingumba yabyaye karindwi (*2) 
3. Ibuka nawe mwene Data cyagihe cyose warize 
waratabawe mugihe gikomeye  
Ibuka isezerano ry’Imana umubyeyi yibagirwa uwo 
yabyaye Uwiteka 
 ntiyakwibagirwa narimwe (*2) 
                                  
 
 

25. UWITEKA NIWE MUCYO.
1. Uwiteka niwe mucyo wanjye niwe gakiza kanjye 
nzatinya nde Uwiteka 
 niwe gihome kijye gikingira ubuzima bwanjye (*2) 
2. Icyo nsaba Uwiteka nikimwe ni iki : ni  ukuba 
munsiyiwe iminsi yose  
Uwiteka nyereka inzira zawe unyiyigishirize 
imigenzereze yawe (*2) 
3. Uwiteka unyitegereze ugerageze umutima 
wanjye n’ubwenge bwanjye  
Kuko imbabazi zawe nzireba mumaso yanjye kandi 
ngenderamumurava 
 Wawe mukiza (*2) 
                                  R/Ninde Wabasha kumpindisha 
umushyitsi umutima wanjye 
                                      Ntabwouzatinya naho nahura 
n’intambara nyinshi nzajye nibuka yuko 
                                      Uhoraho y andwaniriye 
intambara nyinshi cyane (*2)



26. TURARIZE MANA TURATAKAMBYE.
1. Turarize Mana turatambye tuririyeumurimo 
wawe hagati muri iyi minsi 
Uhembure kandi utumeny e kandi ukangure 
n’abasinziriye. 
2. Tukweretse intama zavunitse kugirango uzishyire 
kubitugu byawe  
N’izakomeretse nazo Mana ubagire umwe. 
3. Utabereye maso umudugudu abarinzi bawo 
babera maso ubusa  
Kura igisuzuguriro mumurimo wawe kandi wite 
k’ugutaka kw’abagusenga. 
                            R/Icyampa Mana mumaso yanjye 
akaba isoko y’amarira 
                                Menshi cyane nkuririra umurimo 
wawe nkaririra abarimbuka. 
 
                                       
 

27. TUGARAGARA.
1. Tugaragara nk’abakene nyamara burya 
dutungishije benshi batubona  
Nk’abagiye gupfa ariko dore turi bazima iteka 
tugaragara nk’abatazwi  
Nyamara burya turi ibirangirire (*2) 
2. Witinya yewe Yakobo bwoko bwanyu Isiraheri 
ntiwihebe nzi amakuba  
N’ubukene bwawe nzi n’ugutukwa n’abiyita 
Abayuda kandi ari ab’Isinagogi  
Ya Satani ariko ni ukuri humura uri umutunzi 
abaguhagurukiye bazacogora  
Abakugisha impaka uzababura (*2) 
3. Nimwakire amahoro kandi amahoro yanjye abe 
muri mwe ntimuhangayikishwe 
 n’ibiyi si kuko nzi ibyo imitima yanyu ishaka 
ndirahiriye, ndirahiriye sinzongera 
kunywa kunzabibu ukundi kugeza igihe nzicarana 
n’umugeni wanjye nakoye 
amaraso (*2) 
                                 R/Ni ukuri ntacyo tubaye ubwo 
twamenywe n’umwami Mana 
                                     Usumba byose intare yo 
mumuryango wa Yuda ni igishyitsi 
                                     cya Dawidi yemwe ntacyo 
tubaye (*2)

28. UWITEKA WE.
1. Uwiteka we tega ugutwi wumve gusenga 
kw’abana bawe ubu turi kurugamba 
Dukeneye imbaraga n’amavuta y’mwuka wera (*2) 
2. Icyatumye Petero ashobozwa kuzura,  Tabita 
nacya kimuga cyo kwirembo 
Ryiza kigakira agashobozwa guhamya Yesu ashize 
amanga nuko yari afite 
Ayo y’umwuka wera (*2) 
                                     R/Abayobozi tubasabiye ayo 
mavuta, abaririmbyi 
                                        Itorero ryose rikwiriye ayo 
mavuta kuko ari ayo umumaro ukomeye 
                                        Mw’uyu murimo (*2)

29. ABANYAMUGISHA.
1. Baraki yashatse kuvuma abisiraheri kuko yari 
yumvise amateka yabo asanga 
Balamu aramubwira ati mvumira buriya bwoko 
nzabatsinde uwo uhaye umugisha 
Arawuhabwa kandi uwuvumye ahinduka ikivume 
none mvumira bariya b’isiraheri (*2) 
2. Baraki abwira Balamu ati ngaho bavume kandi 
nubavuma nzagushyira hejuru  
Balamu agerageje biramunanira maze uwiteka 
aramubwira have have Balamu 
Have have Balamu we mbese ninde ubasha 
kuvuma uwo ntavumye 
 erega buriya bwoko nabuhaye umugisha (*2) 
3. None nshuti waba unanijwe n’ibibazo by’isi cg 
intambara, tuza umutima  
Niba Imana ikwishimira ntanarimwe uzakorwa 
n’isoni ibikwasamiye ibibumbye 
Iminwa aho uzajya hose Imana izakujya imbere,  
erega washyizweho ikimenyetso 
Cy’abanyamugisha (*2) ninde ubasha kuvuma uwo 
Imana itavumye. 
                              R/Turi abanyamugisha 
twaratoranyijwe nuzashaka kutuvuma 
                                   Azatwirukaho agwe ruhabo 
ataradufata tuzava muri iyi si tukiri 
                                   Abanyamugisha kuko azi 
amazina yacu uwo mwami w’abami (*2) 
 
 

30. GUKORERA IMANA.
1. Gukorera Imana ntagihombo, ubikore neza maze 
wirebere, bikore ukiranuka  
Kandi murukundo urebe ngo uragwiza imigisha 
myinshi itagira akagero  
Na Hezekiya kubw’imirimo myiza yongerewe 
imyaka yo kurama (*2) 
2. Gukore imirimo y’Imana murukundo bigira 
umumaro mwinshi cyane  
Tabita yarabibonye ubwo yari akuwe mumubiri 
.Abapfakazi n’imfubyi  
Baramuririra, bati yatudoderaga amakanzu meza 
Imana irabyumva iramuzura (*2) 
3. Imana twizeye ni Imana nyamana abayikorera 
ntabwo izigera ibambura  
Izabahemba neza kuko ibabereye maso,  ijisho 
ryayo rizahora kuri bo  
Umva mwene data hitamo neza  ntawakoreye 
Imana uzikorera amaboko (*2) 
                            R/Ntizaduta ntizaduhana izahora 
iduhetse kumugongo wayo  
                            Kubayikorera ntaburyarya ibakubira 
inshuro ijana izabaha n’ubugingo (*2)


31. UMUNTU MURI IYI SI.
1. Umuntu muri iyi si afashe igihe mu ntambara 
n’iminsi ye yose nink’ukorera ibihembo mwe abari 
mw’isi yose nimuvugirize uwiteka  
impundu muze mumaso ye muririmba 
mumukorere munezerewe (*2) 
2. Abasore b’imigenda bazacogor4a bananirwe 
abiringiye Imana basubizwemo 
Integer nshya bazatumbagira mukirere bagurukishe 
amababa nk’ibisiga  
Bazirukanka be kunanirwa bakore iby’ubutwari. 
3. Imana niyo iha intege abananiwe bose utibashije 
nawe imwongerera  
Imbaraga mbese Imana yacu twayigereranya nande 
nawe va mugihirahiro 
Yiteguye kugusubiza (*2) 
                              R/Mbega umunezero mwinshi 
mbega imirimo myinshi 
                                  Kubahisemo neza bakiringira 
Imana yabaciyemo imanzi 
                                  mukiganza ntanarimwe 
bazarekwa (*2) 
 
                                    
 
32. UWITEKA IMANA.
1. Uwiteka Imana yaremye ijuru n’isi irema 
inyamaswa, ibimera n’ibindi 
Kuko yabonaga ari byiza imaze kurema ibyo byose 
iti tureme n’umuntu  
Mw’ishusho yacu ase natwe ategeke ibyo mu isi 
byose. 
2. Uwo mugabo akangutse amubonye 
aramwishimira ati uyu ni igufa ryo 
 mumagufa yanjye kandi ni akara ko mumara 
yanjye, nzamukunda azitwa 
 umugore kukoyakuwe mumugabo nicyo gituma 
umugabo asiga se na nyina 
akibanira n’umugore we akaramata. 
3. Yewe mugabo ujye ukunda umugore wawe 
umenye yuko ariwe Imana 
 Igutoranyirije ujye umuba hafi umukuyakuye muri 
byose, ni ukuri Imana  Izabigushoboza.Nawe 
mugore jya wubaha umugabo wawe umugandukire 
Haba kumanywa na nijoro,  jya unyurwa nawe  uko 
mwaba mubayeho kose 
Nugenza utyo Imana izabiguhembera  (*2) Jya 
unyurwa nawe uko mwaba 
 mubayeho kose nugenza utyo Imana 
izabibuhembera (*3) 
                             R/Imaze kurema uwo mugabo iti 
sibyiza ko aguma wenyine 
                                 Imusinziriza ubuticura,  mumbavu 
ze ikuramo urubavu rumwe 
                                 Imuremera umufasha 
umukwiriye (*2)

33. MUGIRE UMWETE WO KWEZWA.
1. Mugire umwete wo kwezwa mubane amahoro 
umuntu kurwe ruhande 
Arwanire gukiranuka musabire abera bose 
mutarobanuye iherezo rya 
 Byose rigeze bugufi (*2) 
2. Mugendane ingeso nziza nk’abana b’umucyo 
murobanure ibishimwa 
Bikurwe mubigawa kandi kukintu cyose mwiheshe 
agaciro amatabaza 
Yanyu ahore amurika (*2) 
3. Musenge ubudatuza kumanywa na mijoro kandi 
muneshe ibyaha 
Mwambare gukiranuka kuko Uwiteka arera 
azabana n’abera  
Ntacyanduye cyose kizagera ahera (*2) 
                        R/Unesha azambikwa umwambaro 
wera azagaburirwa 
                            Manu yahishwe kandi azabona 
Imana amaso kumaso (*2) 
`;

fs.writeFileSync('./scripts/raw_songs.txt', rawPromptText, 'utf8');
console.log('Saved raw_songs.txt successfully');
