import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import scoreFormatter from '@/utility/scoreFormatter'

Vue.config.productionTip = false

// used for formatting prices
Vue.filter('scoreFormatter', scoreFormatter)

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
