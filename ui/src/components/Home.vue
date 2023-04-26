<template>
  <div class="about" >
    <h3 style="text-align: center">JD</h3>
    <n-divider></n-divider>
    <div class="map-wrap" v-if="!hideMap">
      <div class="map" ref="mapContainer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted, onBeforeUnmount, toRaw, onUnmounted, markRaw, shallowRef } from 'vue';
import { Map, NavigationControl, Marker, Popup, FullscreenControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { StyleSpecification, ResourceTypeEnum, MapOptions, LngLatLike } from 'maplibre-gl';
import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';
import project from '../../package.json';
import points from '../../../server/data/points.json';
import places from '../../../server/data/places.json';

const placesMap = Object.fromEntries(places.map(x => [x.IDPl, x]));
const mapContainer = ref<HTMLElement>();
const map = shallowRef<Map>();
const hideMap = ref(false);
const marker = shallowRef<Marker>();

const opts = {
  map_vector: false,
  map_tile: null,
  map_style: null,
  map_mapbox: false,
  map_mapbox_key: null,
};

const initMap = (lngLat: [number, number]) => {
  const {
    map_vector: isVector,
    map_tile: tilePath,
    map_style: stylePath,
    map_mapbox: isMapbox,
    map_mapbox_key: mapboxKey,
  } = opts;
  const tileServer = !isVector && tilePath ? tilePath : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const rasterStyle = {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: [tileServer],
        tileSize: 256,
        attribution:
          '© <a target="_top" rel="noopener" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  } as StyleSpecification;

  const style = isVector ? stylePath : rasterStyle;

  if (style) {
    const mapSetup = {
      container: mapContainer.value,
      style,
      center: lngLat,
      // zoom: 12,
    } as MapOptions;

    if (isMapbox && mapboxKey) {
      mapSetup.transformRequest = (url: string, rt?: ResourceTypeEnum) =>
        isMapboxURL(url) ? transformMapboxUrl(url, String(rt), mapboxKey) : { url };
    }

    const mapInstance = markRaw(new Map(mapSetup));
    mapInstance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.addControl(new FullscreenControl({ container: mapContainer.value }));
    // draggable: true
    marker.value = new Marker({ color: 'gray' });
    marker.value
      .setLngLat(lngLat)
      // .setPopup(new Popup().setText('test'))
      .addTo(mapInstance);

    points.map(x => {
      new Marker({ color: x.color })
        .setLngLat([x.lon, x.lat])
        .setPopup(new Popup()
        .setHTML(`<strong>${x.name}</strong> ${x.color === 'green' ? '🙂': `[${x.num}]`}<br/>${placesMap[x.id]['Note']}  <br/><em>ID: ${x.id}</em>`))
        // .setText())
        .addTo(mapInstance);
    });

    const coordinates = points.map(x => [x.lon, x.lat] as LngLatLike);
    const bounds = coordinates.reduce(
      (bound, coord) => bound.extend(coord),
      new LngLatBounds(coordinates[0], coordinates[0])
    );
    mapInstance.fitBounds(bounds, { padding: 50 });

    return mapInstance;
  }
};

onMounted(async () => {
  if (mapContainer.value) {
    map.value = initMap([18.652778, 54.350556]);
  }
});
</script>
<style lang="scss" scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: 500px;
}

.map {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
