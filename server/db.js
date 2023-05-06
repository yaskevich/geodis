import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Sequelize, DataTypes } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'data', 'data.db'),
    define: {
        timestamps: false
    }
});

try {
    await sequelize.authenticate();
    console.log('Database OK');
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

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

const getPlaces = async () => {
    console.log('places', await db.Place.findAll({ raw: true }));
}

export default {
    getPlaces
}
