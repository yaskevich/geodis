import express from 'express';
import path, { dirname } from 'path';
import compression from 'compression';
import bodyParser from 'body-parser';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import passportJWT from 'passport-jwt';
import history from 'connect-history-api-fallback';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
// // import db from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __package = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// // environment variables
const port = process.env.PORT || 8080;
const secret = process.env.SECRET;
const appName = __package?.name || String(port);
const commit = process.env.COMMIT;
const unix = process.env.COMMITUNIX;

const getUserInfo = async (x) => {
  return { id: 1, username: 'ok', email: 'ok', activated: true };
};

const strategy = new passportJWT.Strategy(
  {
    // jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
    jwtFromRequest: passportJWT.ExtractJwt.fromExtractors([
      passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
      passportJWT.ExtractJwt.fromUrlQueryParameter('jwt')
    ]),
    secretOrKey: secret,
  },
  (jwtPayload, done) => getUserInfo(jwtPayload.sub)
    .then((user) => done(null, user))
    .catch((err) => done(err)),
);

const issueToken = (user) => jwt.sign({
  iss: appName,
  sub: user.id,
  iat: new Date().getTime(),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 1)
}, secret);

passport.use(strategy);
// const auth = passport.authenticate('jwt', { session: false }, (err, user, info, status) => { console.log(err, user, info, status); });
const auth = passport.authenticate('jwt', { session: false });

const app = express();

app.use('/api/media', express.static(path.join(__dirname, 'media')));
app.use(compression());
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(history());


app.post('/api/user/login', async (req, res) => {
  // const userData = await db.getUserData(req.body.email, req.body.password);
  // if (userData && Object.keys(userData).length && !userData?.error) {
  //   console.log(req.body.email, '<SUCCESS>');
  //   res.json({
  //     ...userData, token: issueToken(userData), server: __package.version, commit, unix
  //   });
  // } else {
  //   console.log(`login attempt as [${req.body.email}]•[${req.body.password}]►${userData.error}◄`);
  //   res.json(userData);
  // }
  // console.log(req.body);
  // console.log(req.body.email, process.env.USER1, req.body.password, process.env.PASS1);
  if (req.body.email === process.env.USER1 && req.body.password === process.env.PASS1) {
    console.log(req.body.email, '<SUCCESS>');
    res.json({
      token: issueToken({ id: 1 }), server: __package.version, commit, unix
    });
  } else {
    console.log(`login attempt as [${req.body.email}]•[${req.body.password}]`);
  }
});

// app.post('/api/user/reg', async (req, res) => {
//   const userdata = req.body;
//   userdata.privs = 5; // default privileges
//   res.json(await db.createUser(userdata, false));
// });

// app.get('/api/user/info', auth, async (req, res) => {
//   const settings = await db.getSettings(req.user);
//   res.json({
//     ...req.user, server: __package.version, commit, unix, token: issueToken(req.user), settings,
//   });
// });

// app.post('/api/user/activate', auth, async (req, res) => {
//   res.json(await db.changeActivationStatus(req.body?.id, req.user, Boolean(req.body?.status)));
// });

// app.post('/api/user/elevate', auth, async (req, res) => {
//   res.json(await db.elevateUser(req.body?.id, req.user));
// });

// app.post('/api/user/update', auth, async (req, res) => {
//   res.json(await db.updateUser(req.user, req.body));
// });

// app.post('/api/user/reset', auth, async (req, res) => {
//   res.json(await db.resetPassword(req.user, req.body?.id));
// });

app.get('/api/places', auth, async (req, res) => {
  res.sendFile(path.join(__dirname, 'data', 'places.json'));
});

app.get('/api/geo', auth, async (req, res) => {
  res.sendFile(path.join(__dirname, 'data', 'geo.json'));
});

app.post('/api/point', auth, async (req, res) => {
  // console.log(req.body);
  res.json({ id: Number(req.body.id) });
});

app.listen(port);
console.log(`Backend is at port ${port}`);
