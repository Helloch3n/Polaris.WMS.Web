import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/router'

import './style.css'
import 'vant/lib/index.css'
import { ConfigProvider, Button, Field, CellGroup, Empty, Tabbar, TabbarItem, Icon, NavBar, Tag, Grid, GridItem, Tab, Tabs, List, PullRefresh } from 'vant'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册 Vant 组件
app.use(ConfigProvider).use(Button).use(Field).use(CellGroup).use(Empty)
   .use(Tabbar).use(TabbarItem).use(Icon).use(NavBar).use(Tag)
   .use(Grid).use(GridItem).use(Tab).use(Tabs).use(List).use(PullRefresh)

app.mount('#app')