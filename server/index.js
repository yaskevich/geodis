import http from 'http';
import express from 'express';
import path, { dirname } from 'path';
import fs from 'fs';
import compression from 'compression';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import passportJWT from 'passport-jwt';
import history from 'connect-history-api-fallback';
import { fileURLToPath } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'node:events';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __package = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// await db.getPlaces();

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

app.use(history({
  // verbose: true,
  rewrites: [
    { from: /\/api\/.*$/, to: context => context.parsedUrl.pathname }
  ]
}));

app.use(express.static('public'));
app.use('/api/media', express.static(path.join(__dirname, 'media')));
app.use(compression());
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// app.get('/api/places', async (req, res) => {
//   res.sendFile(path.join(__dirname, 'data', 'places.json'));
// });

app.get('/api/places', auth, async (req, res) => {
  res.json(await db.getPlaces());
});

// app.get('/api/geo', async (req, res) => {
//   res.sendFile(path.join(__dirname, 'data', 'geo.json'));
// });

app.get('/api/geo', auth, async (req, res) => {
  res.json(await db.getPlacesGeo());
});

app.post('/api/point', auth, async (req, res) => {
  // console.log(req.body);
  const result = await db.setPlaceStatus(req.body);
  // console.log(result);
  res.json({ result: (result?.shift() === 1) });
});

app.get('/api/status', auth, async (req, res) => {
  res.json(db.statusList);
});

app.get('/api/json', async (req, res) => {
  res.json(await db.getPlacesReadyJSON());
});

app.get('/api/csv', async (req, res) => {
  // const now = (new Date().toJSON().slice(0, 10));
  // res.set('Content-disposition', `attachment; filename=${now}`);
  res.set('Content-Type', 'text/plain');
  res.send(await db.getPlacesReadyCSV());
});

// app.listen(port);

const onSocketError = (err) => {
  console.error(err);
};

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
let processingInProgress = false;

const inform = (msg) => {
  // console.log(wss.clients);
  processingInProgress = false;
  wss.clients.forEach((client) => {
    if (client?.readyState === WebSocket.OPEN) {
      client.send("updated → " + (processingInProgress ? 'working' : 'ready'));
    }
  });
  console.log('::done', msg);
};
const eventHandler = new EventEmitter();

eventHandler.on('performBackgroundTask', () => {
  console.log('::start');
  if (!processingInProgress) {
    processingInProgress = true;
    setTimeout(() => inform('check'), 5000);
  }
});

server.on('upgrade', (request, socket, head) => {
  socket.on('error', onSocketError);
  // console.log('Parsing session from request...');

  // sessionParser(request, {}, () => {
  //   if (!request.session.userId) {
  //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  //     socket.destroy();
  //     return;
  //   }

  //   console.log('Session is parsed!');

  //   socket.removeListener('error', onSocketError);

  //   wss.handleUpgrade(request, socket, head, function (ws) {
  //     wss.emit('connection', ws, request);
  //   });
  // });
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// wss.on('connection', function connection(ws) {
//   ws.on('message', function message(data) {
//     console.log('→ %s', data);
//   });

//   console.log('set', processingInProgress);
//   eventHandler.emit('performBackgroundTask', 1);
//   ws.send('start → ' + (processingInProgress ? 'working' : 'ready'));
// });

server.listen(port, () => { console.log(`Backend is at port ${port}`) });
