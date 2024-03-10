  /**
 * index.js
 * This is your main app entry point
 */

// Set up express, bodyparser, EJS, and session
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const https = require('https');
const fs = require('fs');
const port = 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

var url = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(url)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
  });


// Set up session middleware (part of extension)
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Configure SSL options for HTTPS server
const sslOptions = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
};

// Add all the route handlers in usersRoutes to the app under the path /users
const usersRoutes = require('./routes/routes');
app.use(usersRoutes);

// Create an HTTPS server using the configured SSL options
const httpsServer = https.createServer(sslOptions, app);

// Make the web application listen for HTTPS requests
// Start the server
httpsServer.listen(port, () => {
    console.log(`Server running on https://localhost:${port}`);
});