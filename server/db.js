import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import GeoJSON from 'geojson';
import csv from 'async-csv';
import { Sequelize, Op, DataTypes } from 'sequelize';
// import { Umzug, SequelizeStorage } from 'umzug';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const osmIds = JSON.parse(fs.readFileSync((path.join(__dirname, 'data', 'map.json'))));

const sequelize = new Sequelize({
    dialect: 'sqlite',
    // storage: path.join(__dirname, 'data', 'data.db'),
    storage: ':memory:',
    define: {
        timestamps: false
    },
    logging: false,
});

try {
    await sequelize.authenticate();
    // console.log('Database OK');
} catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit();
}

// const umzug = new Umzug({
//     migrations: { glob: 'migrations/*.js' },
//     context: sequelize.getQueryInterface(),
//     storage: new SequelizeStorage({ sequelize }),
//     logger: console,
//   });
// await umzug.up();

// in your server file - e.g. app.js
// import Project from './data/models/place.js';
// console.log(Project);

const db = {};

const modelsDir = path.join(__dirname, 'models');
const files = fs.readdirSync(modelsDir)
    .filter(
        (file) => file.indexOf('.') !== 0
            && file !== 'index.js'
            && file.slice(-3) === '.js',
    );

for await (const file of files) {
    const modelFile = path.join(modelsDir, file);
    // console.log(modelFile);
    const model = await import(modelFile);
    const namedModel = model.default(sequelize, DataTypes);
    // console.log(namedModel.name);
    db[namedModel.name] = namedModel;
}

Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

// db.sequelize = sequelize;
// db.Sequelize = Sequelize;


await db.Place.sync();

const csvString = fs.readFileSync(path.join(__dirname, 'data', 'source.csv'), 'utf-8');

const csvArr = await csv.parse(csvString, {
    delimiter: ",", columns: ['id', 'form', 'caption', 'note', 'coordinates', 'category', null],
    skip_empty_lines: true
});
// drop header line
csvArr.shift();

await db.Place.bulkCreate(csvArr);

const getOSMinfo = async (osmId) => {
    let datum;
    const pathToOSM = path.join(__dirname, 'cache', 'single', `${osmId}.json`);
    if (fs.existsSync(pathToOSM)) {
        datum = JSON.parse(fs.readFileSync(pathToOSM, { encoding: 'utf8', flag: 'r' }));
    } else {
        console.log('>>>>>>>>>> query', osmId);
        const response1 = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=N${osmId}&format=json&extratags=1&namedetails=1`);
        const datumNom = (await response1.json())?.shift();

        const response2 = await fetch(`https://www.openstreetmap.org/api/0.6/node/${osmId}.json`);
        const osmJSON = await response2.json();
        if (!osmJSON?.elements) {
            console.error('Wrong response from OSM API!');
            process.exit();
        }
        const datumOSM = osmJSON?.elements.shift();

        datum = { nominatim: datumNom, osm: datumOSM };
        fs.writeFileSync(pathToOSM, JSON.stringify(datum, null, 4));
    }
    const name = datum?.osm?.tags["int_name"]
        || datum?.osm?.tags["name:en"] || datum?.osm?.tags["name"] ||
        datum?.['nominatim']?.['display_name']?.split(',')?.shift() || 'ERROR';

    return [name, datum.osm.lon, datum.osm.lat]
};

const states = ['Albania', 'Andorra', 'Armenia', 'Austria', 'Azerbaijan', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',];

const geocode = async (record) => {
    let raw = [];
    const country = states.filter(x => record['note'].includes(x))?.shift() || '';
    const title = `${record['form']}${country ? ', ' + country : ''}`;
    const id = String(record['id']);
    const pathToJSON = path.join(__dirname, 'cache', 'multi', `${id}.json`);
    if (fs.existsSync(pathToJSON)) {
        raw = JSON.parse(fs.readFileSync(pathToJSON, { encoding: 'utf8', flag: 'r' }));
    } else {
        console.log('>>>>>>>>>> query', id);
        // https://nominatim.org/release-docs/latest/api/Search/
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${title}&format=json&addressdetails=1&extratags=1&namedetails=1`);
        raw = await response.json();
        fs.writeFileSync(pathToJSON, JSON.stringify(raw, null, 4));
    }
    return raw;
};

const places = await db.Place.findAll({ raw: true });

for (let item of places) {
    if (item?.id) {
        const osmId = osmIds?.[item.id];
        const vars = await geocode(item);
        const qty = vars.length;

        if (osmId) {
            if (!item?.osm) {
                const info = await getOSMinfo(osmId);
                // const result = 
                await db.Place.update({ name: info[0], lon: Number(info[1]), lat: Number(info[2]), coordinates: `${info[1]}, ${info[2]}`, osm: String(osmIds[item.id]), status: 5, qty }, { where: { id: item.id } });
                // console.log(result);
            }
        } else {
            // guess a variant
            if (qty && !item?.qty) {
                let datum;
                if (qty === 1) {
                    datum = vars[0];
                } else {
                    const filtered = vars.filter(x => x.lat > 15 && x.lon > -10 && x.lon < 60);
                    datum = filtered.length ? filtered[0] : vars[0];
                }

                const name = datum?.['display_name']?.split(',')?.shift() || 'ERROR';
                const lat = Number(datum?.lat);
                const lon = Number(datum?.lon);
                await db.Place.update({ name, lon, lat, coordinates: `${lon}, ${lat}`, qty, status: (qty === 1 ? 2 : 3) }, { where: { id: item.id } });
                // console.log(name, lat, lon);
            } else {
                if (item.qty !== qty) {
                    // console.log('zero!');
                    await db.Place.update({ qty }, { where: { id: item.id } });
                }
            }
        }
    }
}

const getPlaces = async () => await db.Place.findAll({ raw: true });

const getPlacesGeo = async () => {
    const places = await db.Place.findAll({
        where: {
            [Op.and]: [
                sequelize.where(sequelize.fn('length', sequelize.col('coordinates')), { [Op.gt]: 3 }),
                { status: { [Op.ne]: 6 } },
            ],
        },
        raw: true
    });
    return GeoJSON.parse(places, { Point: ['lat', 'lon'] })
};

const setPlaceStatus = async (params) => await db.Place.update({ status: (params?.status || 1) }, { where: { id: Number(params?.id) } });

const statusList = {
    '6': ['success', 'non-mappable'], // (ceased to exist or mythological place)
    '5': ['success', 'OSM ID'],
    '4': ['warning', 'manually set OK'],
    '3': ['error', 'many variants'],
    '2': ['warning', 'single variant'],
    '1': ['warning', 'manually set not OK'],
    '0': ['error', 'zero variants'],
};

export default {
    getPlaces,
    getPlacesGeo,
    setPlaceStatus,
    statusList,
}
