'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Place extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Place.init({
    id: { type: DataTypes.INTEGER, primaryKey: true },
    form: DataTypes.STRING,
    caption: DataTypes.STRING,
    note: DataTypes.STRING,
    coordinates: DataTypes.STRING,
    category: DataTypes.STRING,
    osm: DataTypes.STRING,
    wiki: DataTypes.STRING,
    lon: DataTypes.FLOAT,
    lat: DataTypes.FLOAT,
    status: { type: DataTypes.INTEGER, defaultValue: 0 },
    name: DataTypes.STRING,
    qty: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'Place',
  });
  return Place;
};
