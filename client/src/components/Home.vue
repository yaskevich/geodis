<template>
  <div class="about">
    <h3 style="text-align: center">JD</h3>
    <!-- <n-divider></n-divider> -->
    <div class="map-wrap" v-if="!hideMap">
      <div class="map" ref="mapContainer"></div>
    </div>
  </div>
  <n-modal v-model:show="showModal" preset="dialog" title="Dialog" to=".map" v-if="item?.properties?.id">
    <template #header>
      <div>{{ places[item?.properties?.id]['Sorting form'] }} {{ places[item?.properties?.id]['Caption form'] }}</div>
    </template>
    <div>
      <div>{{ places[item?.properties?.id]['Note'] }}</div>
      <div>OSM: {{ item?.properties?.name }} [{{ item?.properties?.num }}]</div>
    </div>
    <template #action>
      <div>
        <n-space justify="space-between">
          <n-button type="primary" @click="approve(true)">Approve</n-button
          ><n-button type="error" @click="approve(false)">Mark wrong</n-button
          ><n-button type="info" @click="postpone">Postpone</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, toRaw, markRaw, shallowRef } from 'vue';
import { Map, NavigationControl, Marker, Popup, FullscreenControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Position, Point, FeatureCollection, Feature } from 'geojson';
import type { GeoJSONSource, StyleSpecification, ResourceTypeEnum, MapOptions, LngLatLike } from 'maplibre-gl';
import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';
import store from '../store';
// import project from '../../package.json';
// interface IItem {
//   properties: {
//     name: string;
//     num: number;
//     id: number;
//     color: string;
//   };
// }

interface keyable {
  [key: string]: any;
}
const mapContainer = ref<HTMLElement>();
const mapInstance = ref<Map>();
const hideMap = ref(false);
const marker = shallowRef<Marker>();
const showModal = ref(false);
const places = reactive({} as keyable);
const geo = reactive({} as FeatureCollection);
const item = ref<Feature>();

const opts = {
  map_vector: false,
  map_tile: null,
  map_style: null,
  map_mapbox: false,
  map_mapbox_key: null,
};

const postpone = () => {
  showModal.value = false;
};

const approve = async (status: boolean) => {
  showModal.value = false;
  // (map?.getSource('points-source')  as GeoJSONSource)?.setData(geo);
  // console.log(geo);
  const src = mapInstance?.value?.getSource('points-source') as GeoJSONSource;
  if (src && item.value?.properties?.color) {
    item.value.properties.color = status ? 'green' : 'black';
    src.setData(geo as any);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${store.state.token}`,
        'Content-Type': 'application/json',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: JSON.stringify({ id: item.value?.properties.id || 0, status }),
    };
    const response = await fetch('/api/point', options);
    console.log(options);

    if (response.status === 200) {
      const data = await response.json();

      if (item.value?.properties.id === data?.id) {
        console.log('status', data.id, status);
      }
    } else {
      console.log('error', response);
    }
  }

  // map.value.flyTo({
  //   center: e.features[0].geometry.coordinates,
  //   zoom: 9
  // });
  // map.value.setLayoutProperty('points-layer', 'icon-image', ['get', 'color']);
  // map.setLayoutProperty('points-layer', 'icon-image', [
  //   'match',
  //   ['get', 'id'],
  //   e.features[0].properties.id,
  //   'green',
  //   ['get', 'color'],
  // ]);
};

const initMap = async (lngLat: [number, number]) => {
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
      pixelRatio: window.devicePixelRatio,
      center: lngLat,
      zoom: 2,
      // zoom: 12,
    } as MapOptions;

    if (isMapbox && mapboxKey) {
      mapSetup.transformRequest = (url: string, rt?: ResourceTypeEnum) =>
        isMapboxURL(url) ? transformMapboxUrl(url, String(rt), mapboxKey) : { url };
    }

    const map = markRaw(new Map(mapSetup));
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new FullscreenControl({ container: mapContainer.value }));
    // draggable: true

    var el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(/api/media/center.png)';
    el.style.width = '64px';
    el.style.height = '64px';
    el.style.backgroundSize = '50%';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      console.log('clicked');
    });

    marker.value = new Marker(el, { color: 'gray', scale: 0.5 });
    marker.value
      .setLngLat(lngLat)
      // .setPopup(new Popup().setText('test'))
      .addTo(map);

    // points.map(x => {
    //   new Marker({ color: x.color })
    //     .setLngLat([x.lon, x.lat])
    //     .setPopup(
    //       new Popup().setHTML(
    //         `<strong>${x.name}</strong> ${x.color === 'green' ? '🙂' : `[${x.num}]`}<br/>${
    //           placesMap[x.id]['Note']
    //         }  <br/><em>ID: ${x.id}</em><br/><button onclick="myFunction()">Approve</button>`
    //       )
    //     )
    //     // .setText())
    //     .addTo(map);
    // });

    const loadImage = async (name: string) => {
      const response = await fetch(`/api/media/${name}.png`);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      map.addImage(name, bitmap, { pixelRatio: 2 });
    };

    map.on('load', async () => {
      // console.log('pr', window.devicePixelRatio);
      // await Promise.all(
      //   ['orange', 'yellow', 'green'].map(img => {
      //     map.loadImage(`/api/media/${img}.png`, function (error, res) {
      //       if (error) {
      //         throw error;
      //       } else if (res) {
      //         map.addImage(img, imgBitmap, { pixelRatio: 2 });
      //       }
      //     });
      //   })
      // );
      await Promise.all(['orange', 'yellow', 'green', 'black'].map(image => loadImage(image)));
      // const allImages = map.listImages();
      // console.log('all', allImages);
      ////
      if (geo?.features?.length) {
        const layers = map.getStyle().layers;
        // Find the index of the first symbol layer in the map style
        let firstSymbolId;
        for (var i = 0; i < layers.length; i++) {
          if (layers[i].type === 'symbol') {
            firstSymbolId = layers[i].id;
            break;
          }
        }
        map.addSource('points-source', {
          type: 'geojson',
          data: geo,
        });
        map.addLayer(
          {
            id: 'points-layer',
            type: 'symbol',
            // type: "circle",
            source: 'points-source',
            layout: {
              'icon-image': ['get', 'color'],
              'icon-allow-overlap': true,
            },
            paint: {
              // 'icon-opacity': 0.5,
              'icon-color': 'green',
              // "icon-allow-overlap": true,
            },
          },
          firstSymbolId
        );

        map.on('click', 'points-layer', function (e) {
          if (e?.features?.length) {
            // console.log(e.features[0]?.properties?.id, e.features[0]?.properties);
            if (e.features[0]?.properties?.color) {
              e.features[0].properties.color = 'green';
              // console.log(e.features[0]);
              // console.log(e.features[0].properties.id);
              const point = geo.features.find((x: Feature) => x.properties?.id === e?.features?.[0]?.properties?.id);
              if (point?.properties?.id) {
                item.value = point;
                showModal.value = true;
              }
            }
          }
        });
        // points.map(x => {
        //   var el = document.createElement('div');
        //   el.className = 'mrk';
        //   el.onclick = function () {
        //     console.log('here', x);
        //   };
        //   new Marker(el).setLngLat([x.lon, x.lat]).addTo(map);
        // });
        // const coordinates = points.map(x => [x.lon, x.lat] as LngLatLike);
        const coordinates = geo.features.map((x: Feature) => (x?.geometry as Point)?.coordinates);
        const bounds = coordinates.reduce(
          (bound: any, coord: Position) => bound.extend(coord),
          new LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 50 });
      }
      ////
    });

    return map;
  }
};

onMounted(async () => {
  if (mapContainer.value) {
    // console.log('tkn',store.state.token);
    
    const response1 = await fetch('/api/places', {
      headers: { 'Authorization': `Bearer ${store.state.token}` },
    });
    const data1 = await response1.json();
    Object.assign(places, Object.fromEntries(data1.map((x: any) => [x.IDPl, x])));

    const response2 = await fetch('/api/geo', {
      headers: { 'Authorization': `Bearer ${store.state.token}` },
    });
    const data2 = await response2.json();
    Object.assign(geo, data2);

    mapInstance.value = await initMap([18.652778, 54.350556]);
  }
});
</script>
<style lang="scss" scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: calc(100vh - 160px);
}

.map {
  position: absolute;
  width: 100%;
  height: calc(100vh - 160px);
}

// :deep(.mrk) {
//   background-image: url('https://sites-formations.univ-rennes2.fr/mastersigat/images/75709127.png');
//   background-size: cover;
//   width: 32px;
//   height: 32px;
//   border-radius: 50%;
//   cursor: pointer;
// }
</style>
