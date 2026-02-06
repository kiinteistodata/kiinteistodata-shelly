# Kiinteistodata Shelly

[Suomeksi](#suomeksi) | [In English](#in-english)

---

## Suomeksi

### Yleiskuvaus

Shelly Gen2 -releautomatiikkaskripti Kiinteistodatan varauskalentereille.

Skripti hakee varausajat Kiinteistodatan Open API:sta ja ohjelmoi päälle/pois-aikataulut suoraan Shelly-laitteeseen. Rele kytkeytyy päälle ennen varausta ja pois varauksen päättyessä. Ajoitukset (esilämmitys, jälkiaika, yhdistäminen) lasketaan palvelimella -- skripti vain hakee valmiit ajat ja ohjelmoi ne laitteeseen.

### Miten se toimii

1. Skripti asennetaan Shelly Gen2 -laitteeseen (esim. Shelly Plus 1, Shelly Pro 1)
2. Se kyselee (pollaa) Kiinteistodatan timings-rajapintaa säännöllisin väliajoin (oletus: 5 min)
3. Kun ajoitukset muuttuvat, skripti poistaa vanhat ajastukset ja luo uudet laitteeseen
4. Ajastukset tallentuvat laitteen muistiin, joten rele toimii vaikka verkkoyhteys katkeaisi tilapäisesti
5. Yöaikaan pollaus pysäytetään ja rele pakotetaan pois päältä

### Vaatimukset

- Shelly Gen2 -laite (Plus- tai Pro-sarja), jossa on releohjaus
- Laitteella internet-yhteys (Wi-Fi)
- Kiinteistodatan tili, jossa on moderni varauskalenteri ja Open API -avain

### Asetukset

Muokkaa asetusmuuttujia tiedoston `shelly_code.js` alussa:

| Muuttuja | Kuvaus | Esimerkki |
|---|---|---|
| `PROPERTY_ID` | Kohteen UUID | `"a1b2c3d4-..."` |
| `CALENDAR_ID` | Modernin varauskalenterin UUID | `"e5f6a7b8-..."` |
| `RESOURCE_ID` | Varattavan kohteen (resurssin) UUID | `"c9d0e1f2-..."` |
| `API_KEY` | Open API -avain | `"abc123..."` |
| `API_URL` | API:n osoite (ei yleensä tarvitse muuttaa) | `"https://api.kiinteistodata.fi/open-api-v1/properties"` |
| `POLL_INTERVAL_MS` | Kyselyväli millisekunneissa | `300000` (= 5 min) |
| `DAYS_AHEAD` | Kuinka monta päivää eteenpäin haetaan | `7` |
| `NIGHT_START_HOUR` | Tunti jolloin pollaus lopetetaan | `23` |
| `NIGHT_END_HOUR` | Tunti jolloin pollaus aloitetaan uudelleen | `5` |

#### Mistä saan UUID:t ja API-avaimen?

- **PROPERTY_ID**: Kiinteistodatan hallintapaneelissa kohteen asetuksissa (kohteen yksilöivä tunniste)
- **CALENDAR_ID**: Modernin varauskalenterin asetuksissa
- **RESOURCE_ID**: Varattavan kohteen asetuksissa (esim. sauna, pesutupa)
- **API_KEY**: Hallintapaneelin Open API -asetuksista

### Asennus

1. Yhdistä Shelly-laitteen web-käyttöliittymään (laitteen paikallinen IP-osoite selaimella)
2. Siirry kohtaan **Scripts** (Skriptit)
3. Luo uusi skripti
4. Liitä tiedoston `shelly_code.js` sisältö
5. Vaihda asetusmuuttujiin oikeat kohteen/kalenterin/resurssin UUID:t ja API-avain
6. Tallenna ja ota skripti käyttöön (Enable)

### Yötila

Yöllä (oletuksena klo 23-05) skripti lopettaa rajapinnan kyselyn ja pakottaa releen pois päältä. Tämä estää turhat kytkennät yöaikaan. Yöajan voi säätää muuttujilla `NIGHT_START_HOUR` ja `NIGHT_END_HOUR`.

### Virhetilanteet

- **Verkkoyhteys katkeaa**: Laitteeseen ohjelmoidut ajastukset toimivat edelleen. Kun yhteys palaa, skripti jatkaa normaalia toimintaa.
- **API ei vastaa**: Skripti tulostaa virheen konsoliin ja yrittää uudelleen seuraavalla kyselykierroksella.
- **Virheellinen vastaus**: Jos API palauttaa odottamattoman vastauksen, skripti ohittaa sen ja yrittää seuraavalla kierroksella.

### Testaus

PC-testaukseen voi käyttää `shelly_simulator.js`-tiedostoa, joka emuloi Shellyn rajapinnat:

```
node shelly_simulator.js
```

Simulaattori tekee oikean HTTP-kutsun Kiinteistodatan rajapintaan, mutta emuloi Shellyn Schedule- ja Switch-rajapinnat muistissa.

---

## In English

### Overview

Shelly Gen2 relay automation script for Kiinteistodata booking calendars.

The script fetches booking timings from the Kiinteistodata Open API and programs on/off schedules directly onto the Shelly device. The relay turns on before a booking starts and off when it ends. Timing adjustments (pre-heating, post time, merging) are calculated server-side -- this script simply fetches the ready timings and programs them onto the device.

### How it works

1. The script is installed on a Shelly Gen2 device (e.g. Shelly Plus 1, Shelly Pro 1)
2. It polls the Kiinteistodata timings API at a configurable interval (default: 5 min)
3. When timings change, the script deletes old schedules and creates new ones on the device
4. Schedules are stored in the device's memory, so the relay works even if the network connection is temporarily lost
5. During night hours, polling is paused and the relay is forced OFF

### Requirements

- A Shelly Gen2 device (Plus or Pro series) with relay control
- Internet connection on the device (Wi-Fi)
- A Kiinteistodata account with a modern booking calendar and an Open API key

### Configuration

Edit the configuration variables at the top of `shelly_code.js`:

| Variable | Description | Example |
|---|---|---|
| `PROPERTY_ID` | Property UUID | `"a1b2c3d4-..."` |
| `CALENDAR_ID` | Modern booking calendar UUID | `"e5f6a7b8-..."` |
| `RESOURCE_ID` | Reservable item (resource) UUID | `"c9d0e1f2-..."` |
| `API_KEY` | Open API key | `"abc123..."` |
| `API_URL` | API base URL (usually no need to change) | `"https://api.kiinteistodata.fi/open-api-v1/properties"` |
| `POLL_INTERVAL_MS` | Polling interval in milliseconds | `300000` (= 5 min) |
| `DAYS_AHEAD` | How many days ahead to fetch | `7` |
| `NIGHT_START_HOUR` | Hour to stop polling | `23` |
| `NIGHT_END_HOUR` | Hour to resume polling | `5` |

#### Where to find the UUIDs and API key?

- **PROPERTY_ID**: In the Kiinteistodata management panel, under the property settings (unique identifier)
- **CALENDAR_ID**: In the modern booking calendar settings
- **RESOURCE_ID**: In the reservable item settings (e.g. sauna, laundry room)
- **API_KEY**: In the management panel under Open API settings

### Installation

1. Connect to your Shelly device's web interface (open its local IP address in a browser)
2. Go to **Scripts**
3. Create a new script
4. Paste the contents of `shelly_code.js`
5. Replace the configuration variables with your property/calendar/resource UUIDs and API key
6. Save and enable the script

### Night mode

During night hours (default: 23:00 - 05:00), the script stops polling the API and forces the relay OFF. This prevents unnecessary switching during the night. The night hours can be adjusted with the `NIGHT_START_HOUR` and `NIGHT_END_HOUR` variables.

### Error handling

- **Network connection lost**: Schedules already programmed onto the device continue to work. When the connection is restored, the script resumes normal operation.
- **API not responding**: The script prints an error to the console and retries on the next polling cycle.
- **Invalid response**: If the API returns an unexpected response, the script skips it and retries on the next cycle.

### Testing

For PC-based testing, use `shelly_simulator.js` which emulates the Shelly APIs:

```
node shelly_simulator.js
```

The simulator makes real HTTP requests to the Kiinteistodata API but emulates the Shelly Schedule and Switch APIs in memory.

---

## Kiitokset / Thanks

Tämä projekti perustuu Jaska Uimosen luomaan [sauna_shelly](https://github.com/juimonen/sauna_shelly) -projektiin (BSD-3-Clause). Alkuperäinen skripti toteutti saunanohjauksen Kiinteistodatan varauskalenterin avulla Shelly-releelle. Kiitos Jaskalle hienosta pohjasta, jonka päälle tämä projekti on rakennettu.

This project is based on [sauna_shelly](https://github.com/juimonen/sauna_shelly) by Jaska Uimonen (BSD-3-Clause). The original script implemented sauna control via a Kiinteistodata booking calendar on a Shelly relay. Thanks to Jaska for the excellent foundation this project is built upon.
