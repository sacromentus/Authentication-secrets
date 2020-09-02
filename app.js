//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");


const app = express();    //creating a new app instance to use express

app.set('view engine', 'ejs');    //setting our view engine to use ejs
app.use(express.static("public"));  //tells EJS to look in public folder for static files
app.use(bodyParser.urlencoded({     //use body parser to parse our requests
  extended: true
}));

const URL = "mongodb://localhost:27017/userDB"; // connect to users' database where we store logins & passwords

mongoose.connect(URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});


const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

/* const secret stores our secret phrase that seeds the authentication
  add plugin to schema this will encrypt the database and use encryptedFields
  to encrypt the password thereby reducing authentication time
*/
const secret = "ChickenDoneRightIsFarSuperior";
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
                                                //

const User = mongoose.model("User", userSchema);

/*  GET routes are below. NOTE: we do not use
    app.get("/secrets") because that gives unfettered
    access to the secrets page;

    instead we only allow entry after registering or
    after a successful login from the /login route  */

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

/*  Below we handle the post routes for the
    register & login routes */

app.post("/register", function(req,res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err) {
    if(err)
      console.log("Error in app.post(/register): " + err);
    else {
      res.render("secrets");    //
    }
  });

});

app.post("/login", function(req,res) {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email: username}, function(err, foundUser) {
    if(err) {
      console.log("Error in app.post(login): " + err);
    } else {
      if(foundUser) {
        if(foundUser.password === password) { // if we found a user and the pass word matches we permissively render secrets
          res.render("secrets");
          console.log(password);
        }else
          res.send("Failed login! Hit back to try again!");
      }
      else
        res.send("Failed login! Hit back to try again!");
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
