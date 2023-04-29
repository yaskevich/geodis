<template>
  <div class="about">
    <h3 style="text-align: center">JD</h3>
    <!-- <n-divider></n-divider> -->
    <div class="map-wrap" v-if="!hideMap">
      <div class="map" ref="mapContainer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, reactive, onMounted, onBeforeUnmount, toRaw, onUnmounted, markRaw, shallowRef } from 'vue';
import { Map, NavigationControl, Marker, Popup, FullscreenControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoJSONSource, StyleSpecification, ResourceTypeEnum, MapOptions, LngLatLike } from 'maplibre-gl';
import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';
import project from '../../package.json';
import points from '../../../server/data/points.json';
import places from '../../../server/data/places.json';
import geo from '../../../server/data/geo.json';

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
      await Promise.all(['orange', 'yellow', 'green'].map(image => loadImage(image)));
      // const allImages = map.listImages();
      // console.log('all', allImages);
      ////
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
            console.log(e.features[0].properties.id);
            const item = geo.features.find(x => x.properties.id === e?.features?.[0]?.properties?.id);
            if (item?.properties?.id) {
              item.properties.color = 'green';
              // (map?.getSource('points-source')  as GeoJSONSource)?.setData(geo);
              const src = map.getSource('points-source') as GeoJSONSource;
              if (src) {
                src.setData(geo as any);
              }
              // map.setLayoutProperty('points-layer', 'icon-image', ['get', 'color']);
              // map.setLayoutProperty('points-layer', 'icon-image', [
              //   'match',
              //   ['get', 'id'],
              //   e.features[0].properties.id,
              //   'green',
              //   ['get', 'color'],
              // ]);
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

      const coordinates = points.map(x => [x.lon, x.lat] as LngLatLike);
      const bounds = coordinates.reduce(
        (bound, coord) => bound.extend(coord),
        new LngLatBounds(coordinates[0], coordinates[0])
      );
      map.fitBounds(bounds, { padding: 50 });
      ////
    });

    return map;
  }
};

onMounted(async () => {
  if (mapContainer.value) {
    map.value = await initMap([18.652778, 54.350556]);
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
