require('dotenv').config();

module.exports = {
  secretKey: process.env.SECRET_KEY,
  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  maUser: process.env.MA_USER,
  maPassword: process.env.MA_PASSWORD,
  maServer: process.env.MA_SERVER,
  maDbUrl: process.env.MA_URL
};
