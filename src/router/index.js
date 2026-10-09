import { createRouter, createWebHashHistory } from 'vue-router'
import Index from '../views/index.vue'
import AboutUs from '../views/about-us.vue'
import AboutUs2 from '../views/about-us2.vue'
import WhatWeDo from '../views/what-we-do.vue'
import WhatWeDo2 from '../views/what-we-do2.vue'
import Grow from '../views/grow/grow.vue'
import GrowMain from '../views/grow/grow-main.vue'
import GrowCommunity from '../views/grow/grow-community.vue'
import GrowService from '../views/grow/grow-service.vue'
import Destination from '../views/destination/destination.vue'
import ContactUs from '../views/contact-us.vue'

const routes = [
  { path: '/', name: 'home', component: Index },
  { path: '/aboutus', name: 'aboutus', component: AboutUs },
  { path: '/aboutus2', name: 'aboutus2', component: AboutUs2 },
  { path: '/whatwedo', name: 'whatwedo', component: WhatWeDo },
  { path: '/whatwedo2', name: 'whatwedo2', component: WhatWeDo2 },
  { path: '/destination', name: 'destination', component: Destination },
  { path: '/contact-us', name: 'contact', component: ContactUs },
  {
    path: '/grow',
    component: Grow,
    children: [
      { path: '', name: 'grow', component: GrowMain },
      { path: 'community', name: 'grow-community', component: GrowCommunity },
      { path: 'service', name: 'grow-service', component: GrowService },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
