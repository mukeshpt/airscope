/* AirScope — constants & configuration. */
window.AirScope = window.AirScope || {};

AirScope.CFG = {
  endpoints: {
    weather: 'https://api.open-meteo.com/v1/forecast',
    air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    geocode: 'https://geocoding-api.open-meteo.com/v1/search',
    reverse: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
  },

  defaultPlace: {
    name: 'New Delhi',
    admin1: 'Delhi',
    admin2: null,
    country: 'India',
    country_code: 'IN',
    latitude: 28.6139,
    longitude: 77.209,
    feature_code: 'PPLC',
    population: 257803,
  },

  quickPlaces: [
    { label: 'New Delhi', q: 'New Delhi' },
    { label: 'Mumbai', q: 'Mumbai' },
    { label: 'Gurugram', q: 'Gurugram' },
    { label: 'Bengaluru', q: 'Bengaluru' },
    { label: 'Beijing', q: 'Beijing' },
    { label: 'London', q: 'London' },
    { label: 'Los Angeles', q: 'Los Angeles' },
  ],

  maxCompare: 2,

  /* WHO 2021 air-quality guidelines (24-hour values, µg/m³; CO in µg/m³ too). */
  pollutants: [
    { key: 'pm2_5', label: 'PM2.5', who: 15, unit: 'µg/m³', note: 'Tiny smoke particles — the most harmful kind' },
    { key: 'pm10', label: 'PM10', who: 45, unit: 'µg/m³', note: 'Dust and pollen — shows up as haze' },
    { key: 'ozone', label: 'Ozone (O₃)', who: 100, unit: 'µg/m³', note: 'Smog gas that forms on sunny days' },
    { key: 'nitrogen_dioxide', label: 'NO₂', who: 25, unit: 'µg/m³', note: 'Sharp-smelling gas from vehicles' },
    { key: 'sulphur_dioxide', label: 'SO₂', who: 40, unit: 'µg/m³', note: 'Gas from burning coal and oil' },
    { key: 'carbon_monoxide', label: 'CO', who: 4000, unit: 'µg/m³', note: 'Odourless gas from burning fuel' },
  ],

  /* ------------------------------------------------------------------------
   * "What's going wrong — and how to fix it". Plain-language fixes split
   * into what one person can do and what the city / state / country can do.
   * `byPollutant` adds bullets for whichever pollutant drives today's AQI.
   * ---------------------------------------------------------------------- */
  fixes: {
    generalPerson: [
      'On bad-air days, plan outdoor exercise for the early morning — the air is usually cleanest then.',
      'Wear an N95-style mask when AQI is 100 or more — it blocks most smoke and dust.',
      'Keep windows shut on bad days and run a purifier if you have one; open up again when the air clears.',
      'Never burn trash, leaves or wood in the open — it is one of the biggest local pollution sources.',
      'Walk, cycle or take the bus or train for short trips — fewer cars mean cleaner air for everyone.',
      'Service your vehicle and keep tyres properly inflated — worn engines and soft tyres quietly add pollution.',
      'Plant trees and care for the ones already near you — leaves catch dust and cool your street.',
    ],
    generalCity: [
      'Publish live pollution numbers for every neighbourhood, so people know when to protect themselves.',
      'Ban open trash and crop-residue burning — and give people a practical way to dispose of waste instead.',
      'Move people onto buses, trains, cycles and electric vehicles — most city pollution comes from traffic.',
      'Sweep and water the roads, cover building sites and pave bare ground — dust is a big part of the haze.',
      'Check and enforce: vehicle emission tests, factory filters, brick kilns, diesel generators.',
      'Plan streets with trees, parks and footpaths — they cut pollution and heat at the same time.',
      'Warn schools, hospitals and outdoor workers whenever levels turn unhealthy.',
    ],
    byPollutant: {
      pm2_5: {
        person: [
          'PM2.5 — tiny smoke particles from traffic, industry and fires: avoid walking along busy roads at rush hour.',
        ],
        city: [
          'PM2.5 is the most dangerous pollutant: clean up vehicle fleets, factories and brick kilns, stop burning, and dust-proof roads and building sites.',
        ],
      },
      pm10: {
        person: [
          'PM10 — dry dust from roads and building work: on windy dry days, keep street-side windows closed.',
        ],
        city: [
          'Mechanised street sweeping, water sprinkling and green covers on building sites cut dust (PM10) fast.',
        ],
      },
      ozone: {
        person: [
          'Ozone — a smog gas that forms on sunny afternoons from traffic fumes: exercise early, not at midday, and don\u2019t idle your car in the sun.',
        ],
        city: [
          'Ozone is made from other pollution: cutting traffic and factory fumes is the only real cure, especially in hot sunny weather.',
        ],
      },
      nitrogen_dioxide: {
        person: [
          'NO₂ — vehicle exhaust: quieter side streets usually mean far less of it in your lungs.',
        ],
        city: [
          'NO₂ comes mostly from diesel vehicles: cleaner fuel, stricter engine checks, low-emission zones and better public transport.',
        ],
      },
      sulphur_dioxide: {
        person: [
          'SO₂ — from burning coal and heavy oil: not much you can do personally; this one is a job for regulators.',
        ],
        city: [
          'SO₂ falls quickly when power plants and factories switch to cleaner fuel and fit scrubbers to their chimneys.',
        ],
      },
      carbon_monoxide: {
        person: [
          'CO — an invisible gas from burners and engines: never run generators or engines in closed spaces or under windows.',
        ],
        city: [
          'Efficient engines, cleaner fuels and smoother traffic flow all bring CO down.',
        ],
      },
    },
  },

  /* ------------------------------------------------------------------------
   * Famous polluted areas — real photos (Wikimedia Commons) shown in the hero
   * when you search a place. Matching: nearest entry from the same country;
   * when it's far from the searched point the caption says how far. `credit`
   * is shown on hover.
   * ---------------------------------------------------------------------- */
  pollutionShots: [
    { cc: 'IN', lat: 28.61, lon: 77.21, caption: 'Smog over Delhi — one of the world\'s most polluted capitals', credit: 'wili hybrid · CC BY 2.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Smog_in_the_skies_of_Delhi%2C_India.jpg/1920px-Smog_in_the_skies_of_Delhi%2C_India.jpg' },
    { cc: 'IN', lat: 28.46, lon: 77.03, caption: 'Dense November smog over Gurugram, right next to Delhi', credit: 'Saurabh Kumar · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Smog_as_visible_in_the_Gurgaon_area_near_Delhi_on_Nov_2016.jpg/1920px-Smog_as_visible_in_the_Gurgaon_area_near_Delhi_on_Nov_2016.jpg' },
    { cc: 'IN', lat: 26.45, lon: 80.35, caption: 'Open waste burning in Kanpur — one of the many haze sources in the Gangetic plain', credit: 'Biswarup Ganguly · CC BY 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Garbage_Burning_-_Kanpur_20220509_083327.jpg/1920px-Garbage_Burning_-_Kanpur_20220509_083327.jpg' },
    { cc: 'IN', lat: 19.07, lon: 72.88, caption: 'Smog over Ghatkopar, Mumbai', credit: 'Udaykumar PR · CC BY 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Smog%2CGhatkopar%2CMumbai_-_panoramio_%281%29.jpg/1920px-Smog%2CGhatkopar%2CMumbai_-_panoramio_%281%29.jpg' },
    { cc: 'IN', lat: 22.57, lon: 88.36, caption: 'A smoggy skyline in Kolkata', credit: 'Biswarup Ganguly · CC BY 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Smoggy_Skyline_-_Kolkata_2016-06-14_4135.JPG/1920px-Smoggy_Skyline_-_Kolkata_2016-06-14_4135.JPG' },
    { cc: 'CN', lat: 39.9, lon: 116.4, caption: 'Smog over Beijing\'s Forbidden City', credit: 'Daniel Case · CC BY-SA 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/View_over_Forbidden_City_to_Jingshan_Park%2C_Beijing%2C_in_smog.jpg/1920px-View_over_Forbidden_City_to_Jingshan_Park%2C_Beijing%2C_in_smog.jpg' },
    { cc: 'PK', lat: 31.55, lon: 74.34, caption: 'Record smog over Lahore and the Punjab, seen from space (Nov 2024)', credit: 'NASA MODIS · Public domain', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Record_Levels_of_Smog_in_Pakistan_%28MODIS_2024-11-13%29.jpg/1920px-Record_Levels_of_Smog_in_Pakistan_%28MODIS_2024-11-13%29.jpg' },
    { cc: 'BD', lat: 23.81, lon: 90.41, caption: 'Haze over Motijheel, Dhaka', credit: 'এই হলো অভীক · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/UnusualHazeInMotijheel2020.jpg/1920px-UnusualHazeInMotijheel2020.jpg' },
    { cc: 'NP', lat: 27.72, lon: 85.32, caption: 'The Kathmandu valley under its winter haze', credit: 'Krishna k. sahh · CC0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kathmandu_Valley_panoramic_view_from_Shivapuri_hills_under_haze.jpg/1920px-Kathmandu_Valley_panoramic_view_from_Shivapuri_hills_under_haze.jpg' },
    { cc: 'MN', lat: 47.89, lon: 106.91, caption: 'Smog-filled Ulaanbaatar — the world\'s coldest capital burns coal to stay warm', credit: 'Einar Fredriksen · CC BY-SA 2.0', img: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/View_towards_a_smog-filled_Ulaanbaatar_from_the_Zaisan_Memorial_%28Mongolia_2010_406%29.jpg' },
    { cc: 'KZ', lat: 43.24, lon: 76.89, caption: 'Winter smog over Almaty, trapped between the mountains', credit: 'Igors Jefimovs · CC BY 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Smog_over_Almaty.jpg/1920px-Smog_over_Almaty.jpg' },
    { cc: 'TH', lat: 18.79, lon: 98.99, caption: 'Burning season in northern Thailand — forest and farm fires choke Chiang Mai', credit: 'Takeaway · CC BY-SA 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Burning_mountains_Thailand.JPG' },
    { cc: 'ID', lat: -6.21, lon: 106.85, caption: 'Jakarta under its yearly pollution season', credit: 'SunDawn · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Jakarta_Pollution_November_24.jpg/1920px-Jakarta_Pollution_November_24.jpg' },
    { cc: 'VN', lat: 21.03, lon: 105.85, caption: 'Hanoi\'s museum spire through the city haze', credit: 'kitmasterbloke · CC BY 2.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Museum_spire_with_air_pollution.jpg/1920px-Museum_spire_with_air_pollution.jpg' },
    { cc: 'IR', lat: 35.69, lon: 51.39, caption: 'Tehran under its summer pollution blanket, framed by the Alborz mountains', credit: 'Chrisrabinson · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Air_pollution_in_Tehran_in_summer.jpg/1920px-Air_pollution_in_Tehran_in_summer.jpg' },
    { cc: 'IQ', lat: 33.31, lon: 44.36, caption: 'A dust storm swallowing Iraq — Baghdad\'s skies turn orange several times a year', credit: 'NASA MODIS · Public domain', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Dust_Storm_in_Iraq_%28MODIS_2025-05-09%29.jpg/1920px-Dust_Storm_in_Iraq_%28MODIS_2025-05-09%29.jpg' },
    { cc: 'EG', lat: 30.04, lon: 31.24, caption: 'Cairo\'s permanent haze over the city, seen from the Giza plateau', credit: 'Mustang Joe · CC0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/The_Giza_Plateau%2C_Cairo_%2853723940570%29.jpg/1920px-The_Giza_Plateau%2C_Cairo_%2853723940570%29.jpg' },
    { cc: 'NG', lat: 6.45, lon: 3.39, caption: 'Waste fires on Lagos Island — a daily source of smoke', credit: 'Joshua Okunfolami · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Waste_incineration_and_air_pollution_in_Lagos_Island_02.jpg/1920px-Waste_incineration_and_air_pollution_in_Lagos_Island_02.jpg' },
    { cc: 'MX', lat: 19.43, lon: -99.13, caption: 'Mexico City\'s smog, trapped in its mountain bowl', credit: 'Snapdragon66 · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Flying_over_Mexico_City%2C_Mountains%2C_smog.JPG/1920px-Flying_over_Mexico_City%2C_Mountains%2C_smog.JPG' },
    { cc: 'BR', lat: -23.55, lon: -46.63, caption: 'São Paulo\'s skyline under its pollution dome', credit: 'Wilfredor · CC0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Panoramic_view_of_air_pollution_in_S%C3%A3o_Paulo_city%2C_Brazil.jpg/1920px-Panoramic_view_of_air_pollution_in_S%C3%A3o_Paulo_city%2C_Brazil.jpg' },
    { cc: 'US', lat: 34.05, lon: -118.24, caption: 'Downtown Los Angeles in heavy smog, 1972 — the era that pushed America\'s Clean Air Act', credit: 'Gene Daniels / US National Archives · Public domain', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/LOS_ANGELES_IN_HEAVY_SMOG_-_NARA_-_552394.jpg/1920px-LOS_ANGELES_IN_HEAVY_SMOG_-_NARA_-_552394.jpg' },
    { cc: 'CL', lat: -33.45, lon: -70.67, caption: 'Winter smog over Santiago, trapped by the Andes', credit: 'Y1997xf11 · Public domain', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/SmogSCL.JPG/1920px-SmogSCL.JPG' },
    { cc: 'MK', lat: 42.0, lon: 21.43, caption: 'Skopje — Europe\'s most polluted capital on many winter days', credit: 'Делфина · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/The_fog_of_smog_%2C_%D0%9C%D0%B0%D0%B3%D0%BB%D0%B0_%D0%BD%D0%B0_%D0%BF%D0%BE%D0%B4%D0%BD%D0%BE%D0%B6%D1%98%D0%B5%D1%82%D0%BE_%D0%BD%D0%B0_%D0%92%D0%BE%D0%B4%D0%BD%D0%BE.JPG/1920px-The_fog_of_smog_%2C_%D0%9C%D0%B0%D0%B3%D0%BB%D0%B0_%D0%BD%D0%B0_%D0%BF%D0%BE%D0%B4%D0%BD%D0%BE%D0%B6%D1%98%D0%B5%D1%82%D0%BE_%D0%BD%D0%B0_%D0%92%D0%BE%D0%B4%D0%BD%D0%BE.JPG' },
    { cc: 'RU', lat: 69.35, lon: 88.2, caption: 'Norilsk — the Arctic nickel city, among the world\'s most polluted places', credit: 'Ninara · CC BY 2.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/4Y1A9968_Norilsk_%2828676523730%29.jpg/1920px-4Y1A9968_Norilsk_%2828676523730%29.jpg' },
    { cc: 'IT', lat: 45.46, lon: 9.19, caption: 'Europe\'s smog bowl: the Po Valley from space — Milan sits at its heart', credit: 'NASA MODIS · Public domain', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Haze_in_the_Po_Valley_%28MODIS_2019-10-15%29.jpg/1920px-Haze_in_the_Po_Valley_%28MODIS_2019-10-15%29.jpg' },
    { cc: 'GB', lat: 51.51, lon: -0.13, caption: 'London, December 1952 — Big Ben swallowed by the Great Smog, which killed thousands and changed the world\'s pollution laws', credit: 'Willem van de Poll (Nationaal Archief) · CC0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Een_agent_helpt_mensen_met_oversteken_Op_de_achtergrond_is_Big_Ben_te_zien%2C_Bestanddeelnr_254-1954.jpg/1920px-Een_agent_helpt_mensen_met_oversteken_Op_de_achtergrond_is_Big_Ben_te_zien%2C_Bestanddeelnr_254-1954.jpg' },
    { cc: 'PL', lat: 50.58, lon: 16.5, caption: 'Coal-smoke smog over Nowa Ruda — southern Poland\'s winter problem', credit: 'Jacek Halicki · CC BY-SA 4.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/2017_Smog_nad_Now%C4%85_Rud%C4%85.jpg/1920px-2017_Smog_nad_Now%C4%85_Rud%C4%85.jpg' },
    { cc: 'DE', lat: 51.43, lon: 6.76, caption: 'Duisburg\'s blast furnace in the Ruhr — the industrial heartland once known as Europe\'s most polluted region', credit: 'Tuxyso · CC BY-SA 3.0', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Hochofen_5_Landschaftspark_Duisburg_Nord_Abend_2013.jpg/1920px-Hochofen_5_Landschaftspark_Duisburg_Nord_Abend_2013.jpg' },
  ],

  /* 1 cigarette ≈ 22 µg/m³ of PM2.5 over a day (Berkeley Earth estimate). */
  pm25PerCigarette: 22,

  compareColors: ['#f472b6', '#a78bfa'],

  ranges: [7, 30, 90],

  localStorageKeys: {
    place: 'airscope.place.v1',
    unit: 'airscope.unit.v1',
    compare: 'airscope.compare.v1',
  },
};
