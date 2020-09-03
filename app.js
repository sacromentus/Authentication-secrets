//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); //

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
  password: String
});

/*   We employ the plugin below to hash & salt our passwords
    and save our users into our mongoDB */

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

/* Below we use passport-local-mongoose to set up a local login strategy
   and set up passport to to serialize & deserialize our users        */
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/*  GET routes are below.  */



app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  /*  we check to see if user is already authenticated
      in which case we render the secrets page; if so send them to secrets,
      else{send them to the loginpage}    */

  if(req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
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
