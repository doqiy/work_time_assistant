# 助手提示时间轴

从现有展示项目整理的独立版本，保留提示时间轴，已移除决策演示的页面、导航、脚本、数据与接口。原项目不受影响。

前端使用原生 HTML、CSS、JavaScript，无需 Node.js 或构建步骤。附带 FastAPI 数据适配服务，读取本项目 `data/` 下的字段表、两批真实数据和模拟数据；整目录移动后可重新安装依赖运行。

## 启动

需要 Python 3.10 或以上版本。首次安装依赖需要可访问 Python 包源。

- macOS：双击 `启动时间轴.command`。
- macOS / Linux：在项目目录执行 `./start.sh`。
- 浏览器打开 `http://127.0.0.1:8767/assistant`，按 Control+C 停止服务。

启动脚本在本目录创建 `.venv` 并安装锁定依赖；交付目录不含虚拟环境。默认端口 8767，用于避免与旧演示服务冲突。

手动启动：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8767
```

可通过 `PYTHON_BIN`、`ASSISTANT_HOST`、`ASSISTANT_PORT` 配置启动脚本。服务地址、进程与日志不依赖原项目。

## 项目结构

```text
index.html                 时间轴页面
app.js                     数据加载、筛选、列表与详情
styles.css                 页面样式与提示类别配色
audience.js                观众编号映射
app.py                     页面、静态资源与三个数据接口
data_loader.py             Excel / JSON 数据读取和字段处理
requirements.txt           锁定的 Python 依赖
start.sh                   macOS / Linux 启动脚本
启动时间轴.command         macOS 双击入口
data/                      字段注释表、两批真实 Excel、模拟 JSON
docs/API.md                前后端接口约定
tests/test_data_loader.py  数据语义与源文件校验
```

## 已保留的功能

- 适中频率、高频主播、模拟数据三种来源；按主播和直播间选择记录。
- 发送状态、行为、提示类别、输出形式、付费场景筛选，以及观众 / 文案搜索。
- 用户编号按完整房间记录首次出现生成；点击高亮、只看该观众，筛选后编号不变。
- 间隔视图 / 紧凑视图、分页展示、完整原文与字段详情。
- `is_topic` 分类配色；`topic_type` 保留在详情，不占主列表和筛选栏。
- URL 可携带 `source`、`author_id`、`live_stream_id`、`user_id`、`timestamp` 定位记录。

## 数据文件

| 数据源 | 项目内文件 | 记录数 |
| --- | --- | ---: |
| real | data/直播助手频率时长适中主播建议记录_20261020_v2.xlsx | 25,680 |
| real_high | data/直播助手高频主播建议记录_20261020.xlsx | 62,359 |
| demo | data/demo_data.json | 25 |
| 字段释义 | data/字段注释表.xlsx | 49 个字段 |

默认展示 `real`。文件是原数据的副本，未改写内容。两批真实数据独立展示，不合并或去重。

更换数据可以直接替换同名文件，或设置 `ASSISTANT_FIELDS_PATH`、`ASSISTANT_REAL_DATA_PATH`、`ASSISTANT_HIGH_FREQ_DATA_PATH`、`ASSISTANT_DEMO_DATA_PATH`。建议环境变量使用绝对路径；不设置时全部从本项目 `data/` 读取。同路径文件更新会按文件签名刷新缓存，环境变量改变后需重启服务。

Excel 第一行为表头，读取活动工作表。ID 以字符串返回，字段按注释表白名单保留。`send_time` 只用于核验时间戳单位，不作为新增展示字段；校验不通过时保留时间戳原值，暂停换算和间隔计算。`send_status=true` 仅表示发送成功，不表示曝光或口播。

字段释义由接口读取；枚举名称及颜色映射在 `app.js`。后续修改字段表枚举时，应同步核对 `BEHAVIORS`、`TOPICS`、`STRATEGIES` 等常量。

## 接入正式项目

本版本按**同域根路径**部署：页面 `/assistant`，资源 `/static/*`，数据 `/api/*`。尚未适配 `/某个子目录/` 的路径前缀。

最直接的方式是部署本目录的 FastAPI 应用；前端文件由该服务返回。如果已有后端，只需接入 [三个数据接口](docs/API.md)，再由前端服务提供 `index.html` 和三个 JS / CSS 资源：

| URL | 文件或接口 |
| --- | --- |
| `/`、`/assistant` | index.html |
| `/static/app.js` | app.js |
| `/static/audience.js` | audience.js |
| `/static/styles.css` | styles.css |
| `/api/fields` | 字段释义 |
| `/api/summary` | 数据集说明与主播 / 直播间分组 |
| `/api/records/{author_id}` | 指定房间的完整记录 |

前端和数据服务保持同源；前后端分开部署时，通过反向代理将 `/api/` 转发到后端。不要把整个项目目录作为静态文件目录公开，`data/` 是服务端输入；当前应用只允许返回指定的三个静态资源。项目附真实业务数据，部署范围沿用公司内网。

## 校验

```sh
.venv/bin/python -m unittest discover -s tests -v
```

13 项现有测试涵盖字段白名单、ID 精度、发送状态、时间戳核验、三种来源与房间查询。涉及真实文件数量的断言针对本次随附样本；替换数据集后按新数据更新对应断言。
