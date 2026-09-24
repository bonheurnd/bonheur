import fs from 'fs';

// Let's explicitly define the expected 92 song titles and numbers from the provided text to guarantee 100% exact boundary matching!
export const categoryDefinitions = [
  {
    category_id: 'cat_agakiza',
    category_name: 'AGAKIZA',
    category_slug: 'agakiza',
    category_number: 1,
    songs: [
      { number: '1', title: 'URUKUNDO' },
      { number: '2', title: 'TURASHIMA YESU.' },
      { number: '3', title: 'NOHERI.' },
      { number: '4', title: 'NTABWO TWIBESHYE.' },
      { number: '5', title: 'YESU YESU MWAMI.' },
      { number: '6', title: 'YARATSINZE.' },
      { number: '7', title: 'IKIRARA.' },
      { number: '8', title: 'AMARASO.' },
      { number: '9', title: 'NTACYAHA.' },
      { number: '10', title: 'YESU OH YESU.' },
      { number: '11', title: 'YESU NI IGISUBIZO.' },
      { number: '12', title: 'IGITI CY’INGANZAMARUMBO.' },
      { number: '13', title: 'MANA URI MWIZA.' },
      { number: '15', title: 'CHORAS.' },
      { number: '16', title: 'NIMUREKE MVUGE.' },
      { number: '17', title: 'MBESE NKANJYE NARI IKI?' },
      { number: '18', title: 'IZINA RYA YESU.' },
      { number: '19', title: 'MBARAGA ZACU.' },
      { number: '20', title: 'NTABWO TUZAPFA TUZARAMA.' },
      { number: '21', title: 'YEWE MUGENI WANJYE.' },
      { number: '22', title: 'WAMUGOROBA I GETSIMANI.' },
      { number: '23', title: 'TURASHIMA YESU.' },
      { number: '24', title: 'NIMUMWEGERE YESU.' },
      { number: '25', title: 'MFITE AMATSIKO.' }
    ]
  },
  {
    category_id: 'cat_ijuru',
    category_name: 'IJURU',
    category_slug: 'ijuru',
    category_number: 2,
    songs: [
      { number: '1', title: 'TURI ABAGENZI' },
      { number: '2', title: 'AMASEZERANO.' },
      { number: '3', title: 'INGOMA Y’AMAHORO.' },
      { number: '4', title: 'BIBA MU GITONDO.' },
      { number: '5', title: 'UZAMPE IHEREZO RYIZA.' },
      { number: '6', title: 'MFITE AMATSIKO.' },
      { number: '7', title: 'IYO SI NZIZA.' },
      { number: '8', title: 'BAKUNDWA.' },
      { number: '9', title: 'NITWA MUKRISTO.' },
      { number: '10', title: 'MVURA Y’UMUHINDO.' },
      { number: '11', title: 'MVURA Y’UMUHINDO.' },
      { number: '11', title: 'IYO MBA MFITE AMABABA.' },
      { number: '12', title: 'SIKO BIZAHORA.' },
      { number: '13', title: 'NI UKURI.' },
      { number: '14', title: 'ABAGENZI.' },
      { number: '15', title: 'MBONYE YUKO IMIBABARO.' },
      { number: '16', title: 'AMASEZERANO.' }
    ]
  },
  {
    category_id: 'cat_gushima',
    category_name: 'GUSHIMA',
    category_slug: 'gushima',
    category_number: 3,
    songs: [
      { number: '1', title: 'TURAGUSHIMA' },
      { number: '2', title: 'NAGIRIWE UBUNTU.' },
      { number: '3', title: 'IBIHE TWANYUZEMO.' },
      { number: '4', title: 'REKA NDIRIMBIRE UMUKUNZI.' },
      { number: '4', title: 'LA LUMIERE.' },
      { number: '5', title: 'UMWAKA URASHIZE.' },
      { number: '6', title: 'UMWAKA TURANGIJE.' },
      { number: '7', title: 'HALLELUYA.' },
      { number: '8', title: 'IMBARAGA.' },
      { number: '9', title: 'MANA URAKOMEYE.' },
      { number: '10', title: 'CHORAS.' },
      { number: '11', title: 'IMANA YACU.' },
      { number: '12', title: 'IBYIZA.' },
      { number: '12', title: 'BAKOBWA.' },
      { number: '13', title: 'IBIZIGIRA.' },
      { number: '14', title: 'MANA NDAGUSHIMIYE.' },
      { number: '15', title: 'UKURA KUCYAVU.' },
      { number: '16', title: 'MANA YACU URI NZIZA.' }
    ]
  },
  {
    category_id: 'cat_kwizera',
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    category_number: 4,
    songs: [
      { number: '1', title: 'AMAVUTA' },
      { number: '2', title: 'ABANYAMUGISHA' },
      { number: '3', title: 'GUKORERA IMANA.' },
      { number: '4', title: 'UMUNTU MURI IYI SI.' },
      { number: '5', title: 'NI UKURI' },
      { number: '6', title: 'PANTEKOTE.' },
      { number: '7', title: 'UBUKWE = UWITEKA' },
      { number: '8', title: 'MUGIRE UMWETE WO KWEZWA.' },
      { number: '9', title: 'NOEL ABAHANUZI.' },
      { number: '10', title: 'DORE IMINSI.' },
      { number: '11', title: 'MUTWARE INTWARO.' },
      { number: '12', title: 'HAHIRWA.' },
      { number: '13', title: 'NTAMAHORO.' },
      { number: '14', title: 'MWISIRAHERI.' },
      { number: '15', title: 'ISIRAHERI.' },
      { number: '16', title: 'WAMWANZI WANJYE WE.' },
      { number: '17', title: 'BENE RASHELI.' },
      { number: '18', title: 'UMUBIBYI.' },
      { number: '19', title: 'MBESE MWANA WANJYE.' },
      { number: '20', title: 'EFURAHIMU.' },
      { number: '21', title: 'NAGEZE KURUGAMBA.' },
      { number: '22', title: 'NKUKO WAFASHAGA BA\nSOGOKURU.' },
      { number: '23', title: 'GUKORA HAKIRI KUMANYWA.' },
      { number: '24', title: 'GUTABARWA KURI HAFI.' },
      { number: '25', title: 'UWITEKA NIWE MUCYO.' },
      { number: '26', title: 'TURARIZE MANA TURATAKAMBYE.' },
      { number: '27', title: 'TUGARAGARA.' },
      { number: '28', title: 'UWITEKA WE.' },
      { number: '29', title: 'ABANYAMUGISHA.' },
      { number: '30', title: 'GUKORERA IMANA.' },
      { number: '31', title: 'UMUNTU MURI IYI SI.' },
      { number: '32', title: 'UWITEKA IMANA.' },
      { number: '33', title: 'MUGIRE UMWETE WO KWEZWA.' }
    ]
  }
];

const totalSongs = categoryDefinitions.reduce((acc, cat) => acc + cat.songs.length, 0);
console.log('Category 1 songs count:', categoryDefinitions[0].songs.length); // 24
console.log('Category 2 songs count:', categoryDefinitions[1].songs.length); // 17
console.log('Category 3 songs count:', categoryDefinitions[2].songs.length); // 18
console.log('Category 4 songs count:', categoryDefinitions[3].songs.length); // 33
console.log('Total songs count:', totalSongs); // 92
