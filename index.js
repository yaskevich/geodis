import nominatim from 'nominatim-client';
import fs, { symlinkSync } from 'fs';
import { exit } from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const client = nominatim.createClient({
  useragent: "JD",             // The name of your application
  referer: 'http://example.com',  // The referer link
});

// Blocks the event loop
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'places.json')));
const world = JSON.parse(fs.readFileSync((path.join(__dirname, 'data', 'world.json'))));


const states = world.map(x => {
  const name = x['name'].split(/[,(]/);
  const title = name.shift().trim();
  if (!title.includes(' ')) {
    return title;
  }
}).filter(x => x);

let zero = 0;
let more = 0;


for (let unit of data) {
  const country = states.filter(x => unit['Note'].includes(x))?.shift() || '';
  const title = `${unit['Sorting form']}${country ? ', ' + country : ''}`;
  const id = String(unit['IDPl']);

  let info;

  const pathToJSON = path.join(__dirname, 'cache', `${id}.json`);
  if (fs.existsSync(pathToJSON)) {
    info = JSON.parse(fs.readFileSync(pathToJSON, { encoding: 'utf8', flag: 'r' }));
  } else {
    const query = { q: title, addressdetails: '0' };
    console.log('>>>>>>>>>> query', id);
    info = await client.search(query);
    fs.writeFileSync(pathToJSON, JSON.stringify(info, null, 4));
    // exit();
  }
  const qty = info.length;
  if (!qty) {
    ++zero;
    console.log(id.padStart(4), title.padEnd(24), qty);
  } else {
    if (qty > 1) {
      ++more;
    }
  }
}
console.log(zero);
console.log(more);


// Bailleul
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
