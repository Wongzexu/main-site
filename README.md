# main-site

`sjdhqtl.cloud` 主站（下载中心）源码。静态站由 nginx 托管，部署目标 `/srv/downloads`。

## 结构
```
main-site/
├── public/                # 部署的静态站源文件
│   ├── index.html         # 管理页（列表 / 二维码 / 删除）
│   └── assets/qrcode.min.js
├── deploy.sh              # 同步到 /srv/downloads
└── .gitignore
```

运行时数据（不在此仓库）：
```
/srv/downloads/files/     # 可下载文件，属主 dever:nginx 775
```

## 部署
```bash
./deploy.sh
```
脚本会 `rsync public/ -> /srv/downloads/`，并排除 `files/`、`*.bak.*`；随后统一目录 755、文件 644。

## 权限约定
| 路径 | 属主:组 | 权限 |
|---|---|---|
| `/srv/downloads` | dever:dever | 755 |
| `/srv/downloads/files` | dever:nginx | 775（nginx 需写权限以删除） |
| `/etc/nginx/.davpasswd` | root:nginx | 640 |
| `/etc/nginx/conf.d/downloads.conf` | root:root | 644 |

nginx worker 用户是 `nginx`。改站点文件用 dever 即可；改 nginx 配置才需要 sudo。

## 相关
- 管理页：https://sjdhqtl.cloud/
- 文件列表：https://sjdhqtl.cloud/files/
- 命令：`dl-put`（放入/列表/二维码/删除/清空）
