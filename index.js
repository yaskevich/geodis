import nominatim from 'nominatim-client';
import fs from 'fs';
import { exit } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import osm from "osm-api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = nominatim.createClient({
  useragent: "JD",             // The name of your application
  referer: 'http://example.com',  // The referer link
});

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'places.json')));
const world = JSON.parse(fs.readFileSync((path.join(__dirname, 'data', 'world.json'))));
const mapping = JSON.parse(fs.readFileSync((path.join(__dirname, 'data', 'map.json'))));
// const states = world.map(x => {
//   const name = x['name'].split(/[,(]/);
//   const title = name.shift().trim();
//   if (!title.includes(' ')) {
//     return title;
//   }
// }).filter(x => x);

const states = ['Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'The Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',];

let zero = 0;
let more = 0;
let nonplace = 0;
let only = 0;
const output = [];

const out = (dbId, name, lat, lon, num, color = 'orange') =>
  output.push({ id: Number(dbId), name, lat, lon, num, color });

for (let unit of data) {
  let raw;
  const country = states.filter(x => unit['Note'].includes(x))?.shift() || '';
  const title = `${unit['Sorting form']}${country ? ', ' + country : ''}`;
  const id = String(unit['IDPl']);
  const mapped = mapping?.[id];

  if (mapped) {
    // console.log(`ID ${id} -> OSM ID ${mapped}`);
    let datum;
    const pathToOSM = path.join(__dirname, 'cache', 'single', `${mapped}.json`);
    if (fs.existsSync(pathToOSM)) {
      datum = JSON.parse(fs.readFileSync(pathToOSM, { encoding: 'utf8', flag: 'r' }));
    } else {
      console.log('>>>>>>>>>> query', id, mapped);
      const response = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=N${mapped}&format=json&extratags=1`);
      const datumNom = (await response.json())?.shift();
      const datumOSM = (await osm.getFeature("node", mapped))?.shift();
      datum = { nominatim: datumNom, osm: datumOSM };
      fs.writeFileSync(pathToOSM, JSON.stringify(datum, null, 4));
    }
    // : Number(datum?.lat)
    // Number(datum?.lon)
    const name = datum?.osm?.tags["int_name"]
      || datum?.osm?.tags["name:en"] || datum?.osm?.tags["name"] ||
      datum?.['nominatim']?.['display_name']?.split(',')?.shift() || 'ERROR'
    out(id, name, datum.osm.lat, datum.osm.lon, 1, 'green');
    continue;
  }

  const pathToJSON = path.join(__dirname, 'cache', 'multi', `${id}.json`);
  if (fs.existsSync(pathToJSON)) {
    raw = JSON.parse(fs.readFileSync(pathToJSON, { encoding: 'utf8', flag: 'r' }));
  } else {
    const query = { q: title, addressdetails: '1' };
    console.log('>>>>>>>>>> query', id);
    raw = await client.search(query);
    fs.writeFileSync(pathToJSON, JSON.stringify(info, null, 4));
    // exit();
  }



  const qty = raw.length;
  if (!qty) {
    ++zero;
    // console.log(id.padStart(4), title.padEnd(24), qty);
    console.log(id.padStart(4), unit['Sorting form']);

  } else {
    const info = raw.filter(x => x.lat > 0 && x.lon > -10 && x.lon < 60);
    const datum = info[0];
    const name = datum?.['display_name']?.split(',')?.shift() || 'ERROR';
    const lat = Number(datum?.lat);
    const lon = Number(datum?.lon);

    if (!info.length) {
      ++zero;
      continue;
    } else if (info.length === 1) {
      ++only;
      out(id, name, lat, lon, info.length, 'yellow');
    } else {
      out(id, name, lat, lon, info.length);
    }
    // const nodes = info.filter(x => x["osm_type"] === "node");
    // if (nodes?.length === 1) {
    //   out(id, nodes.shift());
    // }
    // else {
    //   const places = nodes.filter(x => x.class === 'place');

    //   if (places?.length > 1) {
    //     ++more;
    //   } else if (!places?.length) {
    //     ++nonplace;
    //   } else if (places.length === 1) {
    //     out(id, places.shift())
    //   }
    // }
  }
}
console.log(0, zero);
// console.log('>', more);
// console.log('x', nonplace);
console.log('1', only);


fs.writeFileSync(path.join(__dirname, 'data', 'points.json'), JSON.stringify(output, null, 2), 'utf8');

// const query = {
//   q: '1 boulevard Anatole France Belfort',
//   addressdetails: '1'
// };

// const query = {
//   q: 'Ysselsteyn, Netherlands',
//   addressdetails: '0'
// };


// const query = {
//   q: 'Warsaw',
//   addressdetails: '0'
// };

// const res = await client.search(query);
