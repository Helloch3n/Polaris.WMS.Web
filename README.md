# Polaris WMS Workspace

本仓库采用多应用结构：

- Web 项目：`apps/web`
- PDA 项目：`apps/pda`

## 运行方式

### Web

```bash
cd apps/web
npm install
npm run dev
```

### PDA

```bash
cd apps/pda
npm install
npm run dev

npm run build
npx cap sync
```
