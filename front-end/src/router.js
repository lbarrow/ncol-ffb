import Vue from 'vue'
import Router from 'vue-router'
import League from './views/League.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'league',
      component: League
    },
    {
      path: '/standings/',
      name: 'standings',
      component: () =>
        import(/* webpackChunkName: "standings" */ './views/Standings.vue')
    },
    {
      path: '/matchups/',
      name: 'matchups',
      component: () =>
        import(/* webpackChunkName: "matchups" */ './views/Matchups.vue')
    },
    {
      path: '/matchup/:id',
      name: 'matchup',
      // route level code-splitting
      // this generates a separate chunk (about.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () =>
        import(/* webpackChunkName: "matchup" */ './views/Matchup.vue')
    }
  ]
})
