//DEPENDENCIES
var express = require('express'),
	app = express(),
	bodyParser = require ('body-parser'),
	mongoose = require('mongoose'),
	
	engine = require('ejs-locals'),

	signUpCntrl = require('./server/controllers/signUpCntrl.js'),
	/*models = require('./server/models/userModels.js'),*/
	routes = require('./routes'),
	User,

	session = require ('express-session'),
	/*mongoStore = require ('connect-mongo')(session),*/

	passport = require ('passport'),
	FacebookStrategy = require ('passport-facebook').Strategy,
	TwitterStrategy = require ('passport-twitter').Strategy,
	GooglePlusStrategy = require('passport-google-plus'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,

	google = require ('googleapis'),
	OAuth2 = google.auth.OAuth2,

	clientID = '745976798389-120ogep7g9a9epojftd36q7sthhcgfc1.apps.googleusercontent.com',
    clientSecret = 'R718cA76TvvoztAsuGOJJA1o',
    callbackURL= 'https://mysterious-fjord-1795.herokuapp.com/authorizegoogle/callback',
	oauth2Client = new OAuth2(clientID, clientSecret, callbackURL),
	scopes = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.install'],
	authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: scopes
	}),

	Mailgun = require('mailgun').Mailgun;
	mg = new Mailgun('6eac3f0cd0c26f5cccb159abf6526e28');


//VIEWER
app.engine('ejs', engine);
app.set('view engine', 'ejs');

//MONGO SETUP
/*mongoose.connect('mongodb://heroku_app35007500:notreallyaGOODPASSWORD1784@mongolab.com:61757/heroku_app35007500'); */

//BODY PARSER
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

//PASSPORT
app.use(passport.initialize());

//Google APIS
google.options({auth: oauth2Client}); 
var drive = google.drive({version: 'v2'});

//SESSION (OPTIONAL) *------------------
app.use(session({
  	secret: 'keyboard Dog',
  	/*
  	saveUninitialized: true,
	resave: true,
	store: new mongoStore({
		db: 'testApp_0',
		host: 'mongolab.com:61757/heroku_app35007500',
		port: 61757
  	})
*/
}));
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
//*---------------------------------------


//PASSPORT STRATEGIES: new Strategy({info}, callbackfunction);
//STATICS
app.use('/client', express.static('client')); 
app.use('/bower_components', express.static('bower_components')); 
app.use('/views/templates', express.static('views/templates')); 

//API
	//PAGES	
	app.get('/', function (request, response) {
		response.render('index'); 
	}); 
	app.get('/googlesiteverification', function (request, response) {
		response.render('googlesiteverification'); 
	}); 

	//SOCIAL MEDIA AUTH
	app.get('/authorizegoogle', function (request, response) {
		response.redirect(authUrl);
	});
	app.all('/authorizegoogle/callback' , function (request, response) {
		oauth2Client.getToken (request.query.code , function(err, tokens) {
			if (!err) {
				/*
				if (session.id !== undefined){
					addAccessToken (models, session.id, tokens.access_token); 
					session.accessToken = tokens.access_token; 
				}
				*/
				oauth2Client.setCredentials(tokens);
			}
		});
	});

	//MISC/TESTING

	app.get('/authenticated', function (request, response) {response.send('Authenticated');});

	app.get('/logout', function (request, response) {
		request.logout();
		console.log('loggedOut');
	});

	app.get('/testingparams', function (request, response) {
		response.send(request.query.sampletext);
	});

	app.get('/listdrivefiles', listDriveFiles);
	app.get('/watchdrivefiles', watchDriveFiles);
	app.get('/fileswatcher', function (request, response) {console.log('x')});
	app.post('/fileswatcher', function (request, response) {
		console.log(request.headers);
		response.status(200); 
	});
	app.post('/fileselectwatch', storeFileIds); 
//LITSENER
app.listen((process.env.PORT || 5000), function () {
	console.log('litsening'); 
}); 

//TODO NEXT:
/*
Endpoint watch files and respond with changes

1i3CmXhR1K-P1HkBE7MeBRZvZiXD-qtA2BGjfT0_3ntE

Try and get headers
*/

function userGenerateCheck (profile, accessToken, models, done) {
	models.user.find ({_id: profile.id}, function (err, results) {
		if (results[0] === undefined) {
			paramsArray = ["id", "email", "username", "displayName", "password"];
			for (var key in paramsArray) {
				if (profile[paramsArray[key]] === undefined) {
					profile[paramsArray[key]] = ""; 
				}
			}
			User = new models.user({_id: profile["id"], email: profile["email"], username: profile["username"], displayName: profile["displayName"], password: profile["password"], accessToken: accessToken});
			User.save (function (err, result) {
				if (err){console.log("ERROR: " + err);}
			});
		}
		else{
			console.log('User Already Exists');
		}
		return done(err, profile);
	});
}

function addAccessToken (models, currentUserID, accessToken) {
	models.user.update(
		{_id: currentUserID}, 
		{$set: {
			accessToken: accessToken
		}},
		function (err, results) {
			if (err) {console.log(err);}
		}
	)
}
function ensureAuthenticated (request, response, next) {
	if (request.isAuthenticated()) {return next();}
	response.redirect('/'); 
}
function listDriveFiles (request, response) {
	//request.accepts('html');
	drive.files.list(function (err, result){
			if (!err) {
				response.send(result); 
			}else{
				response.send(err);
			}
		});
}
function watchDriveFiles (request, response) {
	drive.files.watch({
		"fileId": "1i3CmXhR1K-P1HkBE7MeBRZvZiXD-qtA2BGjfT0_3ntE", 
		"resource": {
			"id": "199c711d-12f6-46d1-941a-6deb7d4a92bb",
			"type": "web_hook",
			"address": "https://mysterious-fjord-1795.herokuapp.com/fileswatcher"
		}

	}, function (err, result) {
		if (!err) {
			response.send(result); 
		}else{
			response.send(err); 
		}
	});
}
var storeFileIds = function  (request, response) {
	if (request.ids !== undefined) {
		var fileIdsArray = request.ids; 
		for (var key in fileIdsArray){
			fileId = fileIdsArray[key]; 
			models.user.update({_id: session.id}, {$push: {filesToWatch: fileId}}, function (err, result){ if (err) {console.log(err);}});
		}
	}else {
		console.log('request.ids is undefined'); 
	}
};
function unstoreFileIds (fileIdsArray, currentUserID) {
	var fileId; 
	for (var key in fileIdsArray) {
		fileId = fileIdsArray[key]; 
		models.user.update({_id: currentUserID}, {$pull: {filesToWatch: fileId}}, function (err, result){ if (err) {console.log(err);}});
	}
}
function unstoreAllFileIds () {
	models.user.update({_id: session.id}, {$set: {filesToWatch: null}}, function (err, result){ if (err) {console.log(err);}});
}


