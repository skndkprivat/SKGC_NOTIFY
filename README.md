# Genesys Cloud Notifikations-lytter

En app til at lytte på notifikationer fra Genesys Cloud (Frankfurt region og andre regioner) med mulighed for at administrere flere forbindelser (kunder) og vælge hvilke notifikationstyper, der skal lyttes på.

## Funktioner

- Håndtering af flere Genesys Cloud-forbindelser (kunder)
- Sikker opbevaring af klient-ID og klient-hemmelighed
- Dropdown med forskellige notifikationstyper
- Realtidsvisning af indkommende notifikationer
- Understøttelse af flere Genesys Cloud-regioner (Frankfurt, US, m.fl.)
- Automatisk polling af brugerstatusser
- Live-opdatering af dashboard med notifikationer

## Forudsætninger

- Node.js (version 14 eller nyere)
- npm (kommer med Node.js)
- En Genesys Cloud-konto med API-adgang
- OAuth-klient-ID og hemmelighed fra Genesys Cloud

## Installation

1. Klon eller download dette repository.

2. Installer afhængigheder:
   ```
   npm install
   ```

3. Opret en `.env`-fil baseret på `.env.example`:
   ```
   cp .env.example .env
   ```

4. Fjern `app.listen()` fra app.js hvis den findes (da serveren startes fra index.js)

5. Start appen:
   ```
   npm start
   ```

6. Åbn appen i din browser på [http://localhost:3000](http://localhost:3000).

## Brug af applikationen

### 1. Tilføj forbindelser
Under "Forbindelser" kan du tilføje Genesys Cloud-kunder ved at angive:
- Kundenavn
- Klient-ID
- Klient-Secret 
- Region (Frankfurt, US East, Dublin, Sydney eller Tokyo)

### 2. Autorisér forbindelser
Efter at have tilføjet en forbindelse, klik på "Autorisér" knappen for at etablere forbindelse til Genesys Cloud.

### 3. Lyt til notifikationer
Under "Lyt til notifikationer":
1. Vælg den forbindelse du vil lytte på
2. Vælg hvilke notifikationstyper du vil modtage (fx bruger-presence, kvalitetsevalueringer)
3. Klik på "Start lytning"

### 4. Se notifikationer i dashboard
I "Notifikations-dashboard":
1. Vælg hvilken forbindelse du vil se notifikationer for
2. Dashboardet viser alle modtagne notifikationer i realtid
3. Nye notifikationer hentes automatisk hvert 10. sekund

## Opsætning af Genesys Cloud API-adgang

Før du kan bruge denne app, skal du oprette en OAuth-klient i Genesys Cloud:

1. Log ind på Genesys Cloud Admin.
2. Gå til **Admin** > **Integrationer** > **OAuth**.
3. Klik på **Tilføj klient**.
4. Vælg **Client Credentials** som granttype.
5. Giv klienten et navn, f.eks. "Notifikations-lytter".
6. Under roller, tildel de nødvendige rettigheder:
   - `notifications`
   - `events`
   - `presence` (for at se brugerstatusser)
   - `quality` (for at se evalueringer)
   - Yderligere rettigheder afhængigt af hvilke notifikationer du vil lytte til
7. Gem klienten og noter CLIENT ID og CLIENT SECRET.

## Notifikationstyper

Appen understøtter flere typer af Genesys Cloud-notifikationer:

- **v2.users.*.presence**: Brugerstatusser og tilstedeværelsesændringer
- **v2.quality.evaluations**: Kvalitetsevalueringer
- Flere notifikationstyper kan tilføjes i konfigurationen

## Teknisk oversigt

Appens arkitektur består af følgende komponenter:

- **Frontend**: EJS-skabeloner med Bootstrap 5 og JavaScript for dynamisk opdatering
- **Backend**: Express.js server, der kommunikerer med Genesys Cloud API
- **Genesys Integration**: Anvender PureCloud Platform Client v2 bibliotek
- **Notifikationshåndtering**: Polling-baseret tilgang der henter data hvert 10. sekund

### Filer og struktur

- `index.js` - Starter Express-serveren
- `app.js` - Definerer Express-ruter og middleware
- `services/genesys.js` - Håndterer kommunikation med Genesys Cloud API
- `services/token.js` - Håndterer OAuth-autentificering og token-opbevaring
- `routes/` - Express-ruter for forbindelser, notifikationer og OAuth
- `views/index.ejs` - Hovedbrugergrænsefladen

## Fejlfinding

Hvis du oplever problemer med at starte serveren:
1. Sørg for at port 3000 ikke allerede er i brug
2. Tjek at app.listen() KUN kaldes i index.js, ikke i app.js
3. Se logfiler for detaljer om eventuelle fejl

## Sikkerhed

- Klient-ID og hemmeligheder gemmes krypteret i en lokal konfigurationsfil
- Adgang til appen bør begrænses til autoriserede brugere
- Overvej at implementere yderligere sikkerhed som f.eks. autentifikation før brug i produktion

## Support

For spørgsmål eller hjælp, kontakt udviklerteamet eller opret et issue i dette repository.