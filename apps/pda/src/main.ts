import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/router'

import './style.css'
import 'vant/lib/index.css'
// 移除了 Toast，按需保留其他组件
import { ConfigProvider, Button, Field, CellGroup, Empty, Tabbar, TabbarItem, Icon, NavBar, Tag, Grid, GridItem } from 'vant'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.use(ConfigProvider)
  .use(Button)
  .use(Field)
  .use(CellGroup)
  .use(Empty)
  .use(Tabbar)
  .use(TabbarItem)
  .use(Icon)
  .use(NavBar)
  .use(Tag)
  .use(Grid)
  .use(GridItem)

app.mount('#app')