// Importeer het npm pakket express uit de node_modules map
import express from 'express'

// Importeer de zelfgemaakte functie fetchJson uit de ./helpers map
import fetchJson from './helpers/fetch-json.js'

// Stel het basis endpoint in
const apiUrl = 'https://fdnd.directus.app/items'

// Haal alle squads uit de WHOIS API op
const squadData = await fetchJson(apiUrl + '/squad')

// Maak een nieuwe express app aan
const app = express()

// Stel ejs in als template engine
app.set('view engine', 'ejs')

// Zorg dat werken met request data makkelijker wordt 
app.use(express.urlencoded({extended: true}))

// Stel de map met ejs templates in
app.set('views', './views')

// Gebruik de map 'public' voor statische resources, zoals stylesheets, afbeeldingen en client-side JavaScript
app.use(express.static('public'))


// Maak een GET route voor de index
app.get('/', function (request, response) {
  // Haal alle personen uit de WHOIS API op
  var query = request.query;

  var url = apiUrl + '/person';

  if (query.name || query.id) {
    var queryString = '?filter={';
    var filters = [];

    if (query.name) {
      // Zet de naam eerst volledig naar kleine letters en vervolgens de eerste letter naar hoofdletter
      var formattedName = query.name.toLowerCase().charAt(0).toUpperCase() + query.name.toLowerCase().slice(1);
      filters.push('"name":"' + encodeURIComponent(formattedName) + '"');
    }

    if (query.id) {
      filters.push('"squad_id":"' + encodeURIComponent(query.id) + '"');
    }

    queryString += filters.join(', ') + '}';

    url += queryString;
  } else {
    // Maak url alleen voor squad_id 4
    var queryString = '?filter={';
    var filters = [];
    filters.push('"squad_id":"' + 4 + '"');

    queryString += filters.join(', ') + '}';

    url += queryString;
  }

  fetchJson(url).then((apiData) => {
    // apiData bevat gegevens van alle personen uit alle squads
    // Je zou dat hier kunnen filteren, sorteren, of zelfs aanpassen, voordat je het doorgeeft aan de view

    // Render index.ejs uit de views map en geef de opgehaalde data mee als variabele, genaamd persons
    response.render('index', { persons: apiData.data, squads: squadData.data })
  })
})

// Maak een POST route voor de index
app.post('/', function (request, response) {
  // Er is nog geen afhandeling van POST, redirect naar GET op /
  response.redirect(303, '/')
})

// Maak een GET route voor een detailpagina met een request parameter id
app.get('/person/:id', function (request, response) {
  // Gebruik de request parameter id en haal de juiste persoon uit de WHOIS API op
  fetchJson(apiUrl + '/person/' + request.params.id).then((apiData) => {
    // Render person.ejs uit de views map en geef de opgehaalde data mee als variable, genaamd person
    response.render('person', { person: apiData.data, squads: squadData.data })
  })
})

app.post('/:id/like-or-unlike', function (request, response) {
  // STAP 1: Haal de huidige gegevens voor deze persoon op, uit de WHOIS API
  fetchJson('https://fdnd.directus.app/items/person/' + request.params.id).then((apiResponse) => { // Het custom field is een String, dus die moeten we eerst omzetten (= parsen)
    // naar een Object, zodat we er mee kunnen werken
    try {
      apiResponse.data.custom = JSON.parse(apiResponse.data.custom)
    } catch (e) {
      apiResponse.data.custom = {}
    }
    // STAP 2: Voeg de like toe aan het custom object..
    if (request.body.action == 'liked') {
      apiResponse.data.custom.like = true
    } else {
      apiResponse.data.custom.like = false
    }
    // STAP 3: Overschrijf het custom field voor deze persoon
    fetchJson('https://fdnd.directus.app/items/person/' + request.params.id, {
      method: 'PATCH',
      body: JSON.stringify({
        custom: apiResponse.data.custom
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    }).then((patchResponse) => {
      // Redirect naar de persoon pagina
      response.redirect(303, '/#members')
    })
  })
})


// Stel het poortnummer in waar express op moet gaan luisteren
app.set('port', process.env.PORT || 8000)

// Start express op, haal daarbij het zojuist ingestelde poortnummer op
app.listen(app.get('port'), function () {
  // Toon een bericht in de console en geef het poortnummer door
  console.log(`Application started on http://localhost:${app.get('port')}`)
})

