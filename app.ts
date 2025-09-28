require('dotenv').config()
// npm i express https cors fs body-parser express-session uuid memorystore @aws-sdk/lib-dynamodb @aws-sdk/client-dynamodb md5 cryptr

const {authenticateUser, isEmail, isPassword, isString, isNumber, reportError, craftRequest, setCookie, sendEmail, generateCode} = require('./functions.js');

import express from "express";
// const express = require("express");
// const https = require("https");
import https from "https";

import cors from "cors"
import { v4 } from "uuid";


import fs from "fs"
import { Request, Response, NextFunction } from 'express';
// const md5 = require('md5');
import md5 from "md5"

import bodyParser from "body-parser"
// const bodyParser = require("body-parser")
const app = express();
const region: string = "us-east-1"
// const session = require("express-session");
// @ts-ignore
import session from "express-session"

import {locateEntry, addEntry, updateEntry} from "./databaseFunctions.js"
// ...existing code...
// Use require for memorystore if import fails

const MemoryStore = require("memorystore")(session);
// ...existing code...

// const bcrypt = require("bcrypt");
import bcrypt from "bcrypt"

// const Cryptr = require('cryptr');
import Cryptr from "cryptr"

const saltRounds = 10;
import type { Options, RegisterBody, User, LoginBody, CodeBody, LocateEntryEntry } from "./types.js";
if (!process.env.ENCRYPTION_KEY) {
    throw new Error("Encryption key isn't set. Add it now.");
}

import { gemini } from "./gemini";
const cmod = new Cryptr(process.env.ENCRYPTION_KEY);

// Things to do

const SCHEMA = ['name','email','password']

// Basic web server configurations
let options: Options;
if (process.env.NODE_ENV === "DEV") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // development certificate
    options = {
        key: fs.readFileSync('C:\\Users\\marac\\code\\hackathon-quhacks\\key.pem'),
        cert: fs.readFileSync('C:\\Users\\marac\\code\\hackathon-quhacks\\cert.pem'),
        // Remove this line once done with production
        rejectUnauthorized: false
    };    
    // Local host
    app.use(cors({
        origin: "http://localhost:5173",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true
    }));
    
} else {

    // STEP 1: This will be where the certificates are stored.

    options = {
        key: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\key.pem'),
        cert: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\certificate.pem'),
        // Remove this line once done with production
        rejectUnauthorized: false
    };    

    app.use(cors({
        origin: process.env.PROD_URL,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true
    }));
    // prod credentials


}


// Setting up cookies
app.use(session({
    secret: process.env.COOKIE_SECRET as string,
    cookie: {
        path: "/",
        maxAge: 2628000000,
        httpOnly: true,     
        sameSite: "none",
        secure: true,
    },
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
        checkPeriod: 86400000 
    }) as any, 
}));

// Setting up body parser
app.use(bodyParser.json({limit: "10mb"}))



app.use(express.json());



const server = https.createServer(options, app)


app.get("/", (req: Request,res: Response) => {
    res.send("new year new me")
})





app.post('/register', async (req: Request,res: Response) => {
    // These are where the checks are. 
    


    // You need to add a variable name for every single thing you are trying to do.
    try {
        const {name, email, password} : RegisterBody = req.body;



        if (password && email && name) {


            if (isEmail(email) && isPassword(password) && isString(name)) {

                // then we should check if the user exists or not
                
                await locateEntry("emailHash", md5(email.toLowerCase())).then((users: "" | User | User[]) => {
                    console.log("this is users", users)
                    if (Array.isArray(users) && users.length > 0) {
                        // This would only occur when this user already exists
                        res.status(307).send(craftRequest(307))
                    } else {
                        const user = Array.isArray(users) ? users[0] : users;

                        if (user) {
                            res.status(307).send(craftRequest(307));
                        } else {
                            let newUser = {};
                            const allKeys = Object.keys(req.body);
                            allKeys.forEach((key) => {

                                if (SCHEMA.includes(key)) {
                                    if (key.toLowerCase() !== "password") {
                                        newUser = {[key]: cmod?.encrypt(req.body[key].trim().toLowerCase())}
                                    }
                                }
                            })

                            const uuid = v4();
                            // We should encrypt the password here
                            // We should maybe add some type safety here
                            bcrypt.hash(password, saltRounds, (err,hash) => {

                                if (err) {
                                    reportError(err);
                                    console.log(err)
                                    res.status(404).send(craftRequest(404));

                                } else {
                                    addEntry({ 
                                        uuid: uuid,
                                        name: name,
                                        emailHash: md5(email.trim()),
                                        email: cmod?.encrypt(email.trim()),
                                        password: hash,
                                        ...newUser,
                                    })
                                    
                                    setCookie(req,uuid);
                                    res.status(200).send(craftRequest(200,uuid));
                                }

                            })
                            // addEntry(newUser);
                        }
                    }
                })
    
    
    
            } else {
                res.status(400).send(craftRequest(400));
            }

        } else {
            res.status(400).send(await craftRequest(400));
        }
    } catch(e) {
        console.log(e);
    }
})

app.post("/login", (req,res) => {

    try {

        const {email, password}: LoginBody = req.body;


        if (isEmail(email) && isPassword(password)) {
            locateEntry("emailHash", md5(email)).then((users: LocateEntryEntry) => {
                if (Array.isArray(users) && users.length > 0) {
                    console.log(users[0])
                    locateEntry("uuid", users[0].uuid).then((user: LocateEntryEntry) => {
                        // console.log(thing);
                        if (user != null&&user!=""&&!Array.isArray(user)) {
                            


                            bcrypt.compare(password, user.password, (err: any,result: boolean) => {
                                if (err) {
                                    console.log(err);
                                    res.status(400).send(craftRequest(400));
                                } else {

                                    
                                    if (result) {
                                        setCookie(req, user.uuid);
                                        res.status(200).send(craftRequest(200));
                                    } else {
                                        res.status(400).send(craftRequest(400));
                                    }


                                }
                            })

                        } else {
                            res.status(400).send(craftRequest(400));
                        }
                    })
                } else {
                    res.status(400).send(craftRequest(400));
                }
            })
        } else {
            res.status(403).send(craftRequest(403));
        }



    } catch(e) {

        reportError(e);
        res.status(400).send(craftRequest(400));
    }



}) 

app.get("/getUser", (req,res) => {

    authenticateUser(req).then((user: string) => {
        if (user === "No user found") {
            res.status(403).send(craftRequest(403));
        } else {
            
            locateEntry("uuid", user).then((user) => {
                // console.error(users);

                if (user) {
                    res.status(200).send(craftRequest(200,user))
                } else {
                    res.status(400).send(craftRequest(400));
                }
                // if (users.length>0) {
                //     const user = users[0];

                //     console.log(user);
                //     res.status(200).send(craftRequest(200,user));

                // } else {
                //     console.log("log",users)
                //     res.status(200).send(craftRequest(200,user))
                // }
            })



        }
    })


})

app.post("/changeSettings", (req,res) => {

    try {

        // const {...x} = req.body;
        // console.log("req",req.body);
        authenticateUser(req).then((id: string) => {

            if (id === "No user found") {
    
                res.status(403).send(craftRequest(403))
            } else {
                
                locateEntry("uuid", id).then((user: LocateEntryEntry) => {
                    if (user !== ""&&!Array.isArray(user)) {
                        

                        const changedUser: any = {}
                        console.log(Object.keys(user))

                        Object.keys(user).map((key) => {
                            console.log("ajdsf", key)
                            if ((key !== "email") && (key !== "emailHash") && (key !== "password")) {
                                if (Object.keys(req.body).includes(key.toLowerCase())) {
                                    changedUser[key] = req.body[key];
                                }
                            }
                        })  


                        console.log("changed user", changedUser)
                        updateEntry("uuid", user?.uuid, changedUser).then((a) => {
                            console.log("a", a);
                            res.status(200).send(craftRequest(200));
                        })
                        return;
                        // do something here
                    } else {
                        res.status(400).send(craftRequest(400));
                    }
    
                    
                })
    
    
    
    
    
            }
    
    
    
        })


    } catch(e) {


        console.log(e)
        reportError(e);
        res.status(400).send(craftRequest(400));
        return;

    }
   


})



// This won't work
app.post("/sendCode", (req,res) => {
    try {

        const {email}: CodeBody = req.body;
        if (isEmail(email)) {
            locateEntry("emailHash", md5(email.trim())).then((users: LocateEntryEntry) => {
                // console.log("this is the",user)
                if (users !== ""&&Array.isArray(users)) {
                    // console.log(user);
                    const user = users[0]
                    const code = generateCode(6)

                    const text = `Hello,

You have asked to reset your password. If this wasn't you, ignore this email.

Your code is: ${code}`
                    // bookmark
                    console.log(user)
                    updateEntry("uuid", user.uuid, {passwordCode: code}).then((response: boolean) => {
                        if (response) {
                            sendEmail(email.trim(), `Reset Password - ${process.env.COMPANY_NAME}`,text).then((alert: boolean) => {
                                if (alert) {
                                    res.status(200).send(craftRequest(200));
                                } else {
                                    res.status(400).send(craftRequest(400));
                                }
                            
                            })
                        } else {
                            res.status(400).send(craftRequest(400));
                        }
                    })
                } else {
                    res.status(400).send(craftRequest(400));
                }
            })
        } else {
            res.status(400).send(craftRequest(400));
        }
    } catch(e) {
        console.log(e);
        reportError(e);
        res.status(400).send(craftRequest(400));
    }
})




app.post("/changePassword", (req,res) => {
    try {
        const {code, password, email} = req.body;

        console.log(isPassword(password))
        console.log(isNumber(code))

        if (isPassword(password) && isNumber(code)) {


            const emailHash = md5(email);

            

            locateEntry("emailHash", emailHash).then((users: LocateEntryEntry) => {
                if (Array.isArray(users)&&users.length>0) {
                    const user = users[0];

                    locateEntry("uuid", user.uuid).then((user: LocateEntryEntry) => {
                        if (!Array.isArray(user)&&user !== "") {

                            if (String(user.passwordCode) === String(code)) {


                                if (isPassword(password)) {
                                    
                                    
                                    bcrypt.hash(password, saltRounds, function(err: any, hash: string) {
                                    // Store hash in your password DB.

                                        if (err) {
                                            reportError(err);
                                            res.status(400).send(craftRequest(400))
                                            
                                        } else {
                                            
                                            updateEntry("uuid",user.uuid,{password: hash}).then((x) => {
                                                res.status(200).send(craftRequest(200));
                                            })
                                        }
                                    });
                                    


                                } else {
                                    res.status(400).send(craftRequest(400, {status: "invalid password"}))
                                }



                            


                            } else {
                                res.status(400).send(craftRequest(400, {status: "invalid code"}))
                            }

                        } else {

                            res.status(400).send(craftRequest(400));


                        }

                    })




                } else {



                    res.status(403).send(craftRequest(403));
                }
            })

            





        } else {
            console.log(code);
            console.log(password);
            console.log(email);
            res.status(400).send(craftRequest(400));
        }

    } catch(e) {
        console.log(e);
        reportError(e);
        res.status(400).send(craftRequest(400));
    }
})




app.post("/api/gemini", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {



    // const result = await gemini(prompt);

      const result = JSON.stringify({
      question: "Which of the following is a primary goal of diversification in an investment portfolio?",
      choices: [
        "To guarantee high returns",
        "To concentrate risk in a single asset",
        "To minimize the impact of any single asset's poor performance",
        "To eliminate all investment risk"
      ],
      answer: 3 // The correct answer is at index 3 (i.e., the third option)
    });

    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini request failed" });
  }
});








server.listen(process.env.PORT, () => {
    console.log("Listening on port:", process.env.PORT)
})






