# main-site

`sjdhqtl.cloud` 主站（下载中心）源码。静态站由 nginx 托管，部署目标 `/srv/downloads`。

## 结构
```
main-site/
├── public/                # 部署的静态站源文件
│   ├── index.html         # 主页（像素麦金塔 / 伪终端入口）
│   ├── download.html      # 下载管理页（列表 / 二维码 / 删除）
│   └── assets/
│       ├── css/               # home.css / download.css
│       ├── js/                # home.js / download.js
│       └── qrcode.min.js
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
- `Ctrl+Space` 或 `Ctrl+点击` 标记，`Ctrl+Enter` 下载已标记文件
- `Backspace` 返回上级，`Ctrl+R` 刷新，`Ctrl+Q` 返回终端
- 鼠标点击目录直接进入；点击已选中的文件直接下载

批量下载由浏览器逐个触发，可能被“多文件下载”权限拦截；需要稳定批量下载时建议服务端打包 ZIP。

## 相关
- 主页：https://sjdhqtl.cloud/
- 下载管理页：https://sjdhqtl.cloud/download.html
- 文件列表：https://sjdhqtl.cloud/files/
- 命令：`dl-put`（放入/列表/二维码/删除/清空）

## 管理模式

终端输入 `manage /dl`，使用服务器的 WebDAV 用户名和密码登录。

| 快捷键 | 操作 |
|---|---|
| Ctrl+A | 全选当前目录文件 |
| Ctrl+C | 清空所有勾选 |
| Ctrl+D | 删除勾选文件；没有勾选时删除当前文件 |
| Ctrl+Space | 勾选/取消当前文件 |
| Ctrl+Enter | 确认后批量下载勾选文件 |
| Ctrl+Shift+Q | 当前文件二维码 |
| Ctrl+R | 刷新 |
| Ctrl+Q | 返回终端 |

方向键、Home/End、PageUp/PageDown 用于选择；Enter 打开目录或下载文件，Backspace 返回上级，Esc 取消弹窗或返回终端。功能字母和空格单独按下不会触发操作，额外修饰键不会匹配；确认弹窗保留 Y/Enter 确认、N/Esc 取消。Ctrl+点击可勾选文件。

删除确认显示全部目标路径，默认聚焦取消，Enter 激活当前聚焦按钮；跨目录勾选也会包含在删除范围内。执行期间禁止更改选择、切换目录、关闭终端和重复提交，并显示逐项进度。成功项移除勾选，失败及未执行项保留，结果列出原因。认证失效立即停止，重新登录后需再次确认；网络错误或超时时先刷新确认文件状态再重试。浏览器批量下载仍可能需要允许多文件下载。

本地开发服务的子目录删除修复仅在本机生效；`dev-server.mjs` 按现有约定不入库。

## 验证

运行 `node --test tests/interactions.test.cjs`，无需安装依赖。测试覆盖组合键、删除锁、部分失败、认证中断和确认范围；本地模拟服务测试在该服务文件不存在时跳过。

## 前端文件组织

页面 HTML 保留结构和资源引用；样式位于 `public/assets/css/`，交互位于 `public/assets/js/`。`home.js` 暂时保留终端、下载 TUI 和管理 TUI 的现有作用域，`download.js` 对应传统下载管理页。脚本仍在页面末尾按二维码库、页面脚本的顺序加载，不需要构建或安装依赖。

后续逻辑拆分顺序：先提取路径编码、文件格式化等公共函数，再分离终端窗口、普通下载 TUI、管理 TUI，最后整理确认框和二维码弹窗。每阶段保留相同行为，验证通过后再进入下一阶段；暂不合并两个页面的认证与状态。
