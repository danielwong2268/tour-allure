var Tour = require('./models/tourModel.js');
var User = require('./models/userModel.js');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var bluebird = require('bluebird');
var request = require('request');


module.exports = function(app) {

  app.use(session({ 
    secret: 'secret',
    resave: false,
    saveUninitialized: true
  }));


  var restrict = function(req, res, next) {
    if (req.session.userId !== undefined) {
      next();
    } else {
      console.log("Access denied!");
      res.send({isAuth: false});
    }
  };
  
// checks the valid inputs adn creates a new object with valid keys
  app.post('/search', function(req,res) {
    var inputObj = req.body.data
    var newObj = {};
    for (var key in inputObj) {
      if (inputObj[key] !== "") {
        newObj[key] = inputObj[key]
      }
    }
//setting up the price based on the $ amount
    if(newObj.price !== undefined) {
      if (newObj.price === "$") {
       newObj.price = {$lt: 26};
      } else if (newObj.price === "$$") {
        newObj.price = {$lt: 51};
      } else if (newObj.price === "$$$") {
        newObj.price = {$lt: 76};
      } else if (newObj.price === "$$$$") {
        newObj.price = {$lt: 101};
      }
    };

    Tour.find(newObj, function(err, data) {
      if (err) {
        console.log('error');
        res.send(err)
      } else {
        res.send(data);
      }
    });
  });


  app.get('/session', restrict,  function(req,res) {
    res.send({isAuth:true});
  });

 
  app.post('/createTour', function(req,res, next) {
    //chose a random downloaded picture to add to the tour as a background image
    // Construct address and send request to google geocode api to fetch Lat/Lng coordinates for given address
    var address = req.body.streetAddress + ", " + req.body.city + ", " + req.body.state;
    var url = 'https://maps.googleapis.com/maps/api/geocode/json?address='+address+'&key=AIzaSyBTKobIvbTZTl469EUXd9iM6Mx_08kJAxM';
    request(url, function (error, response, body) {
      if (error) {
        throw error;
      } else {
        var pictures = ['pictures/brooklynSkyline.jpg', 'pictures/goldenGateBridge.jpg', 'pictures/Park2.JPG', 'pictures/Houses.jpg', 'pictures/Berkeley.jpg', 'pictures/Marina.jpg', 'pictures/Denver.jpg', 'pictures/OutdoorCafe.jpg', 'pictures/LosAngeles.jpg', 'pictures/Tahoe.jpg', 'pictures/cableCar.jpg'];
        var index = Math.floor(Math.random()*pictures.length);
        var pictureUrl = pictures[index];
        // Extract Lat/Lng coordinates from response body, and pass them to newTour object
        var parsedResults = JSON.parse(body).results[0].geometry
        var LatLng = [parsedResults.location.lat, parsedResults.location.lng];
        var newTour = {
          pictureUrl: pictureUrl,
          name: req.body.name,
          streetAddress: req.body.streetAddress,
          city: req.body.city,
          state: req.body.state,
          price: req.body.price,
          date: req.body.date,
          LatLng: LatLng,
          description: req.body.description
        };
        // Create new Tour document on DB using data stored in newTour object
        Tour.create(newTour, function(err, tour) {
          if(err) {
            throw err;
          }
          // Fetch currently signed in user from DB, and add newly created Tour ID to their createdTour's array
          User.findOne({_id : req.session.userId}, function(err, user) {
            if(err) {
              throw err;
            }
            user.createdTours.push(tour._id);
            user.save(function(err, user) {
              if(err) {
               throw err;
              }
              tour.createdBy = user.username
              tour.save(function(err, tour){
                res.send(user);
              })
            });
          })
        });
      }
    });
  });

  // Add a tour's ID to the user's attendingTours property when the user "Joins" the tour
  app.post('/joinTour', restrict, function(req, res) {
    // Find the currently logged in user
    User.findOne({_id: req.session.userId}, function(err, user){
      if (err) {
        res.send(err);
      } else {
        if (user.createdTours.indexOf(req.body.data) > -1) {
          res.send('You cannot join your own tour.');
          return;
        }
        user.attendingTours.push(req.body.data);
        user.save(function(err, user) {
          if(err) {
            return next(err);
          } else {
            console.log('successfully joined tour!');
            res.send(user);
          }
        });
      }
    })
  });

  app.get('/profile', restrict, function(req,res) {
    User.findOne({_id: req.session.userId}, function(err, data){
      if (err) {
        console.log(err);
        res.send(err);
      } else {
        res.send(data);
      }
    })
  });

  app.post('/signup', function (req, res, next) {
    var username = req.body.data.username;
    var password = req.body.data.password;
    var email = req.body.data.email;
    //check to see if a user exists already:
    User.findOne({username: username})
      .exec(function(err, user) {
        if (user) {
          console.log('Account already exists.');
          res.send('Account already exists.');
        } else {
          //if user does not exist, create and save the user:
          var newUser = User({
              aboutMe: 'Tell us about yourself!',
              username: username,
              email: email,
              password: password,
              createdTours: [],
              attendingTours: []
          });
          User.hashPassword(password, function(hash) {
            if(err) return next(err);
            newUser.password = hash;
            newUser.save(function(err, newUser) {
              req.session.regenerate(function () {
                req.session.userId = newUser._id;
                res.send(newUser);
              });
            })
          });
        }
      })
  })

  app.post('/signin', function (req, res, next) {
    var name = req.body.data.username;
    var password = req.body.data.password;

    //find the user first:
    User.findOne({username: name}, function(err, user) {
      if(err) return next(err);
      if(!user) return res.send('Username and/or password invalid.');
      //checks entered PW with the saved hashed/salted PW (defined in user.js)
      //isMatch is a boolean value.
      User.comparePassword(password, user.password, function(err, isMatch) {
        if (err) { return next(err); }
        else if (isMatch) {
          req.session.regenerate(function () {
            req.session.userId = user._id;
            res.send(user);
          });
        } 
        else {
          res.send('Username and/or password invalid.');
        }
      });
    });
  });

  app.get('/logout', function (req, res) {
    req.session.destroy(function() {
      res.send('hey');
    });
  });

  // Fetch information for a specific tour, given its id
  app.post('/fetchTourInfo', function(req, res) {
    var id = req.body.data;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      Tour.findOne({_id: id}, function(err, data) {
        console.log("datainserver:", data);
        if (err) {
          throw err;
        } else {
          res.send(data);
        }
      });
    }
  });

  app.post('/aboutMeEdit', function(req, res) {
    var aboutMe = req.body.data;
    User.findOne({_id: req.session.userId}, function(err, user){
      if (err) {
        throw err;
      } else {
        user.aboutMe = aboutMe;
        user.save(function(err, user) {
          if(err) {
            return next(err);
          } else {
            res.send(user);
          }
        });
      }
    })
  })
}



