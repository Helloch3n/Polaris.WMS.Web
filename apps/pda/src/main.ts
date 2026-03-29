import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Badge, Button, Cell, CellGroup, Checkbox, Divider, Empty, Field, Form, Icon, NavBar, PullRefresh, Search, Tabbar, TabbarItem, Tag, Grid, GridItem } from 'vant'
import 'vant/lib/index.css'

import App from './App.vue'
import { router } from './router/router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Button)
app.use(Badge)
app.use(Cell)
app.use(CellGroup)
app.use(Checkbox)
app.use(Divider)
app.use(Empty)
app.use(Field)
app.use(Form)
app.use(Icon)
app.use(NavBar)
app.use(PullRefresh)
app.use(Search)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Tag)
app.use(Grid)
app.use(GridItem)

app.mount('#app')
