//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const md5 = require("md5"); //require md5 to be able to hash the passwords

const app = express();    //creating a new app instance to use express
const bcrypt = require('bcrypt'); // adding bcrypt for enhanced password security
const saltRounds = 10;      // number of rounds we will salt the user's password

app.set('view engine', 'ejs');    //setting our view engine to use ejs
app.use(express.static("public"));  //tells EJS to look in public folder for static files
app.use(bodyParser.urlencoded({     //use body parser to parse our requests
  extended: true
}));

  // Mongoose Database and Schema/Model set up

const URL = "mongodb://localhost:27017/userDB"; // connect to users' database where we store logins & passwords

mongoose.connect(URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

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
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {  // hash is the resulting hash on user entered password
    const newUser = new User({
      email: req.body.username,
      password: hash  // hash the password upon creation
    });

    newUser.save(function(err) {
      if(err)
        console.log("Error in app.post(/register): " + err);
      else {
        res.render("secrets");
        console.log("Bcrypt hashed password is: " + hash);
      }
    });
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
        bcrypt.compare(password, foundUser.password).then(function(result) {  // we compare user's entered password with the hash password
          if(result == true)
            res.render("secrets");
          else
            res.send("Login failed!")
        });
      }
      else
        res.send("Login failed!"); // if no user is found login fails, too
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
