// script.js

// Import the MongoDB driver and the authentication library
const MongoClient = require('mongodb').MongoClient;
const passport = require('passport');

// Define the connection URL and the database name
const url = 'mongodb://localhost:27017';
const dbName = 'myDatabase';

// Create a new MongoClient
const client = new MongoClient(url);

// Use connect method to connect to the server
client.connect(function(err) {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Connected successfully to server");

  // Get the database
  const db = client.db(dbName);

  // Get the user collection
  const userCollection = db.collection('users');

  // Define a local strategy for authentication
  passport.use(new LocalStrategy(
    function(username, password, done) {
      // Find the user by username
      userCollection.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }
        if (user.password !== password) {
          return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
      });
    }
  ));

  // Define a function to create a new user
  function createUser(username, password, callback) {
    // Check if the username already exists
    userCollection.findOne({ username: username }, function (err, user) {
      if (err) {
        callback(err);
        return;
      }
      if (user) {
        callback(new Error('Username already taken'));
        return;
      }
      // Insert a new user document
      userCollection.insertOne({ username: username, password: password }, function (err, result) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, result.ops[0]);
      });
    });
  }

  // Define a function to handle user sign up
  function handleSignUp(req, res) {
    // Get the username and password from the request body
    const username = req.body.username;
    const password = req.body.password;

    // Create a new user
    createUser(username, password, function (err, user) {
      if (err) {
        res.status(500).send(err.message);
        return;
      }
      // Log in the user
      req.login(user, function (err) {
        if (err) {
          res.status(500).send(err.message);
          return;
        }
        // Send a success message
        res.send('User signed up and logged in');
      });
    });
  }

  // Define a function to handle user log in
  function handleLogIn(req, res) {
    // Authenticate the user
    passport.authenticate('local', function(err, user, info) {
      if (err) {
        res.status(500).send(err.message);
        return;
      }
      if (!user) {
        res.status(401).send(info.message);
        return;
      }
      // Log in the user
      req.login(user, function(err) {
        if (err) {
          res.status(500).send(err.message);
          return;
        }
        // Send a success message
        res.send('User logged in');
      });
    })(req, res);
  }

  // Define a function to handle user log out
  function handleLogOut(req, res) {
    // Log out the user
    req.logout();
    // Send a success message
    res.send('User logged out');
  }

  // Define a function to check if the user is authenticated
  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.status(401).send('User not authenticated');
    }
  }

  // Define a function to get the current user
  function getCurrentUser(req, res) {
    // Send the user object
    res.send(req.user);
  }

  // Use express to create a web server
  const express = require('express');
  const app = express();

  // Use body-parser to parse the request body
  const bodyParser = require('body-parser');
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Use express-session to handle sessions
  const session = require('express-session');
  app.use(session({ secret: 'mySecret', resave: false, saveUninitialized: false }));

  // Use passport to initialize and handle sessions
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize and deserialize user
  passport.serializeUser(function(user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function(id, done) {
    userCollection.findOne({ _id: id }, function (err, user) {
      done(err, user);
    });
  });

  // Define the routes for sign up, log in, log out, and get current user
  app.post('/signup', handleSignUp);
  app.post('/login', handleLogIn);
  app.get('/logout', handleLogOut);
  app.get('/user', isAuthenticated, getCurrentUser);

  // Start the server
  app.listen(3000, function () {
    console.log('Server listening on port 3000');
  });

});