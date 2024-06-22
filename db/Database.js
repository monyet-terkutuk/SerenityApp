const mongoose = require('mongoose');
const config = require('../config');
const {
  dbHost,
  dbName,
  dbPassword,
  dbPort,
  dbUser,
  maUser,
  maPassword,
  maServer,
} = config;

mongoose.set('strictQuery', false);
const mongodbAtlas = `mongodb+srv://${maUser}:${maPassword}@${maServer}/${dbName}?retryWrites=true&w=majority&ssl=true&appName=Cluster0`;
// const mongodbAtlas = `${config.maDbUrl}&appName=Cluster0&dns=retryWrites`
const localConnection = `mongodb://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?authSource=admin`;

mongoose.connect(mongodbAtlas);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', async () => {
  console.log('database connect');
});

module.exports = db;
