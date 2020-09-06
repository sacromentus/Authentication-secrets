//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); //
const GoogleStrategy = require('passport-google-oauth20').Strategy; // to use Google oAUTH
const findOrCreate = require('mongoose-findorcreate');

const app = express();    //creating a new app instance to use express

app.set('view engine', 'ejs');    //setting our view engine to use ejs
app.use(express.static("public"));  //tells EJS to look in public folder for static files
app.use(bodyParser.urlencoded({     //use body parser to parse our requests
  extended: true
}));

/*  Set up our app to use passport  */

app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());

  // Mongoose Database and Schema/Model set up


mongoose.connect(process.env.URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true); // we do this to avoid deprecation warning with passport mongoose

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

/*   We employ the plugin below to hash & salt our passwords
    and save our users into our mongoDB */

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

/* Below we use passport-local-mongoose to set up a local login strategy
   and set up passport to to serialize & deserialize our users
  as well as enabling Google OAuth        */
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/*  GET routes are below.  */



app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google",  {scope: ["profile"] } )
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
    // Successful authentication, redirect home.
      res.redirect('/secrets');
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  User.find({"secret":{$ne:null}}, function(err, foundUsers) {
    if(err)
      console.log(err);
    else {
      if(foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res) {
  if(req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req,res) {
  const submitedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser) {
    if(err)
      console.log(err);
    else {
      if(foundUser) {
        foundUser.secret = submitedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req,res) {
  req.logout();
  res.redirect("/");
});

/*  Below we handle the post routes for the
    register & login routes using passport */

app.post("/register", function(req,res) {
  //register method comes from passport-local-mongoose package
  User.register({username: req.body.username}, req.body.password, function(err, user) {
    if(err) {
      console.log(err); // if there are errors log it and redirect to register root routes
      res.redirect("/register");
    } else {
      /*  the call back is only triggered if the authentication is successful
          i.e., we created a cookie to save the session */
      console.log("Authenticating User.....");
      passport.authenticate("local")(req, res, function() {
        console.log("User successfully authenticated");
        res.redirect("/secrets");
      });
    }

  });
});

app.post("/login", function(req,res) {
  const user = new User ({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err)
      console.log(err);
    else
      passport.authenticate("local")(req,res, function() {
          res.redirect('/secrets');
      });
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
