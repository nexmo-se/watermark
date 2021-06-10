const express = require("express")
const app = express()
var bodyParser = require('body-parser')
var OpenTok = require('opentok');

var apikey="";
var secret="";
var sessions = {};
var opentok = OpenTok(apikey,secret)

app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// use the express-static middleware
app.use(express.static("public"))

app.get("/token", (request, response) => {
  var uid = request.query.u;
  if(uid == undefined){
        console.log("sending default session");
        var token = opentok.generateToken(sessionid);
        response.json({"apikey":apikey,"sessionid":sessionid,"token":token});
  }     
  else {
          if(sessions.hasOwnProperty(uid)){
                console.log("session exists for "+uid);
                let session = sessions[uid];
               /* session already exists, generate a token */
               var token = opentok.generateToken(session);
               response.json({"apikey":apikey,"sessionid":session,"token":token});
            }  
            else{
                console.log("creating new session for "+uid);
               /* session doesn't exists, generate a new session and token */
                opentok.createSession({mediaMode:"routed"},function(error,session){
                    if(error){
                        res.json({});
                    }   
                    else{
                        sessions[uid] = session.sessionId;
                        var token = opentok.generateToken(session.sessionId);
                        response.json({"apikey":apikey,"sessionid":session.sessionId,"token":token});
                    }   
                }); 
            }   
  }         
});


app.listen(process.env.PORT || 3000,
        () => console.log("Server is running..."));
