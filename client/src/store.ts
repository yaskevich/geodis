import { reactive } from 'vue';

const state = reactive({
    token: localStorage.getItem('token') || '',
   });

  export default {
    state,
  };