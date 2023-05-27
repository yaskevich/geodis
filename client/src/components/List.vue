<template>
  <n-space justify="center" v-if="Object.keys(states)?.length">
    <n-data-table :columns="columns" :data="places" :pagination="pagination" :bordered="false" />
    <!-- <n-space vertical>
      <div v-for="place in places">{{ place.id }}. {{ place?.form }} {{ place.status }}</div>
    </n-space> -->
  </n-space>
</template>

<script setup lang="ts">
import { h, ref, reactive, onBeforeMount } from 'vue';
import { NButton, NTag, NSpace, DataTableColumns } from 'naive-ui';
import store from '../store';

interface IPlace {
  name: string;
  qty: number;
  form: string;
  status: number;
  id: number;
}

interface keyable {
  [key: string]: any;
}

const states = reactive({} as keyable);

const places = ref<Array<IPlace>>([]);

onBeforeMount(async () => {
  if (store?.state?.token) {
    const response = await fetch('/api/places', {
      headers: { Authorization: `Bearer ${store.state.token}` },
    });
    if (response.status === 200) {
      const data = await response.json();

      places.value = data;

      const response2 = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${store.state.token}` },
      });
      const data2 = await response2.json();
      Object.assign(states, data2);
    } else {
      if (response.status === 401) {
        localStorage.removeItem('token');
      }
      store.state.token = '';
    }
  }
});

const unhide = async (x: any) => {
  const status = x?.qty ? (x.qty === 1 ? 2 : 3) : 0;
  // console.log(x.id, status);
  const payload = { id: x.id, status };
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${store.state.token}`,
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify(payload),
  };
  const response = await fetch('/api/point', options);
  if (response.status === 200) {
    x.status = status;
  }
};

const createColumns = [
  {
    title: 'ID',
    key: 'id',
    sorter: 'default',
  },
  {
    title: 'Name',
    key: 'form',
    sorter: 'default',
  },
  {
    title: 'Variants',
    key: 'qty',
    sorter: 'default',
  },
  {
    title: 'Status',
    sorter: 'default',
    key: 'status',
    render(row: any) {
      const status = states[String(row?.status || 0)];
      const buttons = [
        h(
          NTag,
          {
            //   strong: true,
            //   tertiary: true,
            type: status?.[0] || 'default',
            //   size: 'small',
          },
          { default: () => status?.[1] }
        ),
      ];

      if (row?.status === 6) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              onClick: () => {
                unhide(row);
              },
            },
            { default: () => (row?.status === 6 ? 'Unhide' : 'Hide') }
          )
        );
      }
      return h(NSpace, {}, { default: () => buttons });
    },
  },
];

const columns = createColumns;
const pagination = false as const;
</script>
