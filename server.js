'use strict';
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const morgan = require('morgan');

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

mongoose.Promise = global.Promise;

const { PORT, DATABASE_URL } = require('./config');
const mongo = require('mongodb').MongoClient

const app = express();
app.use(express.static("public"));
app.use(morgan('common'));

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
  if (req.method === 'OPTIONS') {
    return res.send(204);
  }
  next();
});

//GET list of entire collection. Reference array by response.items
app.get(`/users/`, (req, res) => {
  try {
    MongoClient.connect(DATABASE_URL, {useNewUrlParser: true}, async function(err, client) {    
      assert.equal(null, err);
      const db = client.db('my-kitchen')
      const collection = db.collection('users')
  
      var myPromise = () => {
        return new Promise((resolve, reject) => {
          collection
          .find().toArray((err, items) => {
              err
                ? reject(err)
                : resolve(
                  res.json(items).status(200).send()
                );
            });
        }).catch(e => {
        res.json({message: e})
          return false
        })            
      }
      await myPromise() 
      client.close();
    });
  } catch (e) {
  next(e)
  }
});

//GET single object by user
app.get('/find', jsonParser, async (req, res, next) => {
  try {
  MongoClient.connect(DATABASE_URL, {useNewUrlParser: true}, async function(err, client) {   
    assert.equal(null, err);
    const db = client.db('my-kitchen')
    const collection = db.collection('users')

    var myPromise = () => {
      return new Promise((resolve, reject) => {
        collection
          .find({user: req.query.user})
          .limit(1)
          .toArray(function(err, data) {
            if (data.length === 0){
              reject(err)
              return res.status(404).send("user not found.");
            }
            if (data.length === 1){
              resolve(
                res.json(data[0])
              );
            }
            else {
              reject(err)
              return res.status(400).json({ message: "Something crazy unexpected happened." });
            }
          });
      }).catch(e => {
        return false
     })            
    }
    await myPromise() 
    client.close();
  });
  } catch (e) {
    next(e)
  }
});

//GET single object by ID
app.get(`/users/:id`, (req, res) => {
  if (req.params.id.toString().length !== 24 ){
    res.json({ message: "ObjectId in the database is always 24 digits." }).status(409).send()
  }
  try {
    MongoClient.connect(DATABASE_URL, {useNewUrlParser: true}, async function(err, client) {    
      assert.equal(null, err);
      const db = client.db('my-kitchen')
      const collection = db.collection('users')
      var ObjectId = require('mongodb').ObjectID;
  
      var myPromise = () => {
        return new Promise((resolve, reject) => {
          collection
          .findOne({"_id": new ObjectId(req.params.id)}, function(err, data) {
              if (!(data)){
                reject(err)
                return res.status(404).send("user not found.");
              }
              else {
                resolve(
                res.json(data)                  
                );
              }
           })
        })
        .catch(e => {
           return false
        })            
      }
      await myPromise() 
      client.close();
    });
    } catch (e) {
      next(e)
    }
  });

//POST a new user with any local ingredients included
app.post('/users', jsonParser, async (req, res, next) => {
  try {
  MongoClient.connect(DATABASE_URL, {useNewUrlParser: true}, async function(err, client) {    
    assert.equal(null, err);
    const db = client.db('my-kitchen')
    const collection = db.collection('users')

    const users = {
        create: function(name, ingredients) {
          const user = {
            user: name,
            ingredients: ingredients
          };
          return user
        }
    }

    var myPromise = () => {
      return new Promise((resolve, reject) => {
        collection
          .find({user: req.body.user})
          .limit(1)
          .toArray(function(err, data) {
            if (data.length > 0){
              reject("User already exists.")
            }
            if (data.length === 0){
              resolve(
                collection.insertOne(users.create(req.body.user, req.body.ingredients))
              );
              return res.json({message: "Successly POSTed!"})
            }
            else {
              reject("Something unexpected went wrong.")
            }
          });
        }).catch(e => {
          return res.json({message: e}).status()
      })            
    }
    await myPromise() 
    client.close();
  });
  } catch (e) {
    res.json({ message: `POST connection failed: ${e}`}).status(409).send()
    next(e)
  }
});

//UPDATE a user's saved ingredients.
app.put('/users/:id', jsonParser, (req, res) => {
  if (req.params.id.toString().length !== 24 ){
    res.json({ message: "ObjectId in the database is always 24 digits." }).status(409).send()
  }
  if (!(req.params.id === req.body._id)) {
    res.status(400).send({
      error: "Request path id and request body id values must match."
    })
    return
  }
  try {
    MongoClient.connect(DATABASE_URL, {useNewUrlParser: true}, async function(err, client) {    
      assert.equal(null, err);
      const db = client.db('my-kitchen')
      const collection = db.collection('users')
  
      var myPromise = () => {
        return new Promise((resolve, reject) => {
          collection
           .find({user: req.body.user})
           .limit(1)
           .toArray(function(err, data) {
              if(data.length > 0){
                if (data[0]._id.toString() !== req.params.id){
                  reject(`user ${req.body.user} does not match database ID.`)
                }
                else {
                  resolve (
                    collection.updateOne({"user": req.body.user}, { $set: { "ingredients" : req.body.ingredients } }),
                  )
                  return res.json({message:"Profile saved."})
                }
              }
              if (data.length === 0){
                reject(`user in request wasn't found in database.`)
              }
              else {
                reject("Something unexpected went wrong.")
              }
          });
        }).catch(e => {
          return res.json({message: e})
      })            
    }
    await myPromise() 
    client.close();
  });
  } catch (e) {
    res.json({ message: `PUT connection failed: ${e}`}).status(400)
    next(e)
  }
});

app.use('*', (req, res) => {
  return res.status(500).json({ message: 'Not Found' });
});

let server;

function runServer() {
  return new Promise((resolve, reject) => {
    mongoose.connect(DATABASE_URL, {useNewUrlParser: true}, err => {
      if (err) {
        return reject(err);
      }
      server = app
        .listen(PORT, () => {
          console.log(`Your app is listening on port ${PORT}`);
          resolve();
        })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };
