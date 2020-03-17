const { join } = require('path');
const fs = require('fs');

//load the library
const preconditions = require('express-preconditions')

const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const OpenAPIValidator = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const express = require('express')

const data = require('./zips')
const CitiesDB = require('./zipsdb')

//Load application keys
const db = CitiesDB(data);

const app = express();

//disable etag
app.set('etag', false)

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start ofapp
var count = 0;

// TODO 1/2 Load schemans
new OpenAPIValidator({
    apiSpec: join(__dirname, 'schema', 'zips.yaml')
}).install(app)
    .then(() => {
        //OK we can proceed with rest of the app

        // Start of workshop

        // Mandatory workshop
        // TODO GET /api/states
        app.get('/api/states',
            (req, resp) => { //handler
                console.info('in GET/api/states')
                const result = db.findAllStates();
                //status code 
                resp.status(200)
                //set Header, public, age = 5min
                resp.set('Cache-Control', "public, max-age=300")
                //set content type
                resp.type('application/json')
                resp.set('X-generated-on', (new Date()).toDateString())
                resp.json(result)
            }
        )

        const options = {
            stateAsync: (req) => {
                const state = req.params.state
                const limit = parseInt(req.query.limit) || 10
                const offset = parseInt(req.query.offset) || 0
                console.info(".. in stateasync")
                return Promise.resolve({
                    //"CA_0_10"
                    etag: `"${state}_${offset}_${limit}"`
                })
            }
        }

        // TODO GET /api/state/:state
        app.get('/api/states/:state',
            preconditions(options),
            (req, resp) => { //handler
                //Read the value from the route :state
                const state = req.params.state
                //Read the query string
                const limit = parseInt(req.query.limit) || 10
                const offset = parseInt(req.query.offset) || 0
                //10 results by default
                const result = db.findCitiesByState(state, { offset: offset, limit: limit });
                //status code 
                resp.status(200)
                //set content type
                resp.type('application/json')
                resp.set('X-generated-on', (new Date()).toDateString())
                resp.set("ETag", `"${state}_${offset}_${limit}"`)
                resp.json(result)
            }
        )

        // TODO GET /api/city/:cityId

        // TODO DELETE /api/city/:name

        // TODO POST /api/city
        // Content-Type: application/x-www-form-urlencoded
        app.post('/api/city',
            (req, resp) => {
                const body = req.body;
                /*if (!db.validateForm(body)) {
                    resp.status(400)
                    resp.type('application/json')
                    resp.json({ 'message': 'incomplete form' })
                    return
                }*/
                // passed validation
                //insert data into db
                db.insertCity(body)
                resp.status(201)
                resp.type('application/json')
                resp.json({ 'message': 'created' })

            }
        )

        // Optional workshop
        // TODO HEAD /api/state/:state
        // IMPORTANT: HEAD must be place before GET for the
        // same resource. Otherwise the GET handler will be invoked


        // TODO GET /state/:state/count
        app.get('/api/states/:state/count',
            (req, resp) => { //handler
                const state = req.params.state
                //10 results by default
                const count = db.countCitiesInState(state)
                const result = {
                    state: state,
                    numOfCities: count,
                    timestamp: (new Date()).toDateString()
                }
                resp.status(200)
                //set content type
                resp.type('application/json')
                resp.set('X-generated-on', (new Date()).toDateString())
                resp.json(result)
            }
        )
        // TODO GET /api/city/:name

        // End of workshop


        //workshop02 above

        app.use('/schema', express.static(join(__dirname, 'schema')));

        app.use((error, req, resp, next) => {

            if (error instanceof ValidationError) {
                console.error('Schema validation error: ', error)
                return resp.status(400).type('application/json').json({ error: error });
            }

            else if (error.status) {
                console.error('OpenAPI specification error: ', error)
                return resp.status(400).type('application/json').json({ error: error });
            }

            console.error('Error: ', error);
            resp.status(400).type('application/json').json({ error: error });

        });

        const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`);
        })

    })
    .catch(error => {
        //thre is an error with our yaml file

    })

// Start of workshop
// TODO 2/2 Copy your routes from workshop02 here

// End of workshop