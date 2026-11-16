# main-site

`sjdhqtl.cloud` 主站（下载中心）源码。静态站由 nginx 托管，部署目标 `/srv/downloads`。

## 结构
```
main-site/
├── public/                # 部署的静态站源文件
│   ├── index.html         # 主页（像素麦金塔 / 伪终端入口）
│   ├── download.html      # 下载管理页（列表 / 二维码 / 删除）
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

## nginx：/dl 子目录列表
`/dl` 进入子目录时会请求 `/api/list/<子目录>/`，nginx 必须用前缀匹配（`location = /api/list/` 只能列根目录）：

```nginx
location ^~ /api/list/ {
    alias /srv/downloads/files/;
    autoindex on;
    autoindex_format json;
    autoindex_exact_size off;
    autoindex_localtime on;
    types { }
    default_type application/json;
    add_header Cache-Control "no-store";
}
```

改完执行 `sudo nginx -t && sudo systemctl reload nginx`。

## 权限约定
| 路径 | 属主:组 | 权限 |
|---|---|---|
| `/srv/downloads` | dever:dever | 755 |
| `/srv/downloads/files` | dever:nginx | 775（nginx 需写权限以删除） |
| `/etc/nginx/.davpasswd` | root:nginx | 640 |
| `/etc/nginx/conf.d/downloads.conf` | root:root | 644 |

nginx worker 用户是 `nginx`。改站点文件用 dever 即可；改 nginx 配置才需要 sudo。

## `/dl` 操作
- `↑` `↓` / `Home` `End` / `PageUp` `PageDown` 选择，`Enter` 打开目录或下载选中文件
- `Space` 或 `Ctrl+点击` 标记，`Ctrl+Enter` 下载已标记文件
- `Backspace` 返回上级，`Ctrl+R` 刷新，`Ctrl+Q` 返回终端
- 鼠标点击目录直接进入；点击已选中的文件直接下载

批量下载由浏览器逐个触发，可能被“多文件下载”权限拦截；需要稳定批量下载时建议服务端打包 ZIP。

## 相关
- 主页：https://sjdhqtl.cloud/
- 下载管理页：https://sjdhqtl.cloud/download.html
- 文件列表：https://sjdhqtl.cloud/files/
- 命令：`dl-put`（放入/列表/二维码/删除/清空）
