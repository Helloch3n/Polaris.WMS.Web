# CRUD 页面统一标准

适用范围：所有新建列表页、列表型业务页。

## 必须满足

- 页面容器必须使用 `BaseCrudPage`。
- 槽位结构必须包含：`#search`、`#actions-left`、`#actions-right`、`#data`、`#pager-right`。
- 表格组件必须使用：`NDataTable` + `class="crud-table-flat"`。
- 列配置必须接入：`TableColumnManager` + `useColumnConfig`。
- 列标题必须使用 `createDraggableTitle`，保证支持拖拽排序。
- 业务列必须提供 `sorter`，比较函数统一使用 `compareSortValue`。
- 列宽处理必须通过 `withResizable`，保证可拖拽调整宽度。
- 页面初始化必须先调用 `loadColumnSettings()`，再执行首次查询。
- 列可见性变更必须使用 `handleVisibleChange`，并保留“至少一列可见”提示。
- 新增类按钮必须放在 `#actions-left`，按钮文案统一为 `新增`（不使用 `+` 等符号）。
- 搜索区按钮必须固定在右侧：使用 `crud-page-spacer` 将按钮推到右边，并且统一保留 `查询` + `重置` 两个按钮。
- 搜索区结构优先使用 `n-form inline + class="crud-search-form"`，避免与 `crud-search-row` 混用导致视觉高度不一致。
- 折叠按钮必须位于搜索区最底部中线；折叠后仅保留一条分隔线高度（不保留额外内容区高度）。
- 搜索控件像素规则：输入/选择/数字/日期控件最小宽度统一为 `180px`。
- 搜索按钮像素规则：按钮最小宽度统一为 `72px`。

## 参考模板

- 页面模板：`src/views/_templates/BaseCrudListTemplate.vue`

## 页面改造清单

新建或改造页面时，提交前逐项确认：

- 已使用 `BaseCrudPage` 标准槽位布局
- 已接入 `TableColumnManager`
- 已接入 `useColumnConfig`
- 搜索区右侧已包含 `查询` 与 `重置` 按钮
- 搜索区按钮通过 `crud-page-spacer` 固定在右侧
- 搜索区控件最小宽度已遵循 `180px` 规则
- 搜索区按钮最小宽度已遵循 `72px` 规则
- 折叠后搜索区仅保留底部分隔线高度
- 新增按钮位于左侧，文案为 `新增`
- 所有可展示字段都支持排序
- 列标题可拖拽重排
- 表格样式类已统一为 `crud-table-flat`
- 本地构建通过：`npm run build`
