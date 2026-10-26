# 时间轴接口约定

所有响应使用 UTF-8 JSON，默认同源请求。页面入口 `/assistant`，无需把数据文件放到可下载的静态目录。

## 1. 字段释义

`GET /api/fields`

```json
{
  "fields": [
    {"name": "user_id", "type": "BIGINT", "description": "用户ID", "remark": ""},
    {"name": "send_timestamp", "type": "BIGINT", "description": "时间戳", "remark": ""}
  ]
}
```

示例只列两项，实际接口返回完整 49 项。`fields` 必须是数组；四个子字段为字符串。`type` 保留源表类型，JSON 传输的 ID 仍使用字符串。

## 2. 数据集与分组

`GET /api/summary?source=demo`

`source` 支持 `real`、`real_high`、`demo`。接口缺省为 `demo`，前端默认选择 `real`，所有数据请求都会明确传入 source。

```json
{
  "meta": {
    "source": "demo",
    "title": "模拟数据 · 仅用于展示效果",
    "display_label": "模拟数据",
    "is_demo": true,
    "record_count": 1,
    "field_count": 9,
    "missing_fields": [],
    "extra_fields": [],
    "notes": ["此处为接口结构示例。"],
    "timestamp_unit": "ms",
    "timezone": "Asia/Shanghai"
  },
  "groups": [
    {
      "author_id": "900001",
      "live_stream_id": "990001",
      "count": 1,
      "success_count": 1,
      "failure_count": 0,
      "unknown_count": 0,
      "earliest": 1792474206123,
      "latest": 1792474206123
    }
  ]
}
```

以上为缩小后的结构示例，不代表随附数据的实际数量。

- `meta` 描述整个所选数据集，记录接口也返回相同范围的 meta；`record_count` 不是当前房间条数。
- `groups` 每项对应一组 `author_id + live_stream_id`。计数和有效时间范围必须与本组记录一致。没有有效时间时 earliest / latest 为 null。
- `notes`、`missing_fields`、`extra_fields` 为字符串数组。现有服务还可返回 `timestamp_validation`、`user_id_record_count`、`unique_user_count`，前端不把这些元信息当作原始记录字段。
- 当前 UI 按北京时间显示。`timestamp_unit` 为 `ms`、`s` 或 null；未确认单位时传 null，前端不推测。

## 3. 房间记录

`GET /api/records/900001?source=demo&live_stream_id=990001`

返回 `{"meta": {…}, "records": […]}`。meta 结构同上。records 中单条结构示例：

```json
{
  "author_id": "900001",
  "live_stream_id": "990001",
  "user_id": "9007199254740993",
  "send_timestamp": 1792474206123,
  "behavior_type": 6,
  "is_topic": 8,
  "output_type": 1,
  "suggestion_text": "建议感谢",
  "send_status": true
}
```

未展示的字典字段可按实际数据补充；缺失字段保持缺失或 null。`live_stream_id` 在后端接口可选，前端始终传入，避免合并不同房间。

| 规则 | 对接要求 |
| --- | --- |
| ID 精度 | user_id、author_id、live_stream_id、receiver_author_id、behavior_id 使用字符串；不要先经过浮点数转换 |
| 发送状态 | true = 成功，false = 失败，null / 缺失 = 未知；不要用 0 / 1 代替 |
| 时间戳 | 使用数值并通过 meta 明确单位；同时间保留源顺序 |
| 分类字段 | behavior_type、is_topic、output_type、topic_type、from_strategy 独立返回，不互相推导 |
| 文案 | suggestion_text、topic_text 原样返回；界面按纯文本渲染 |
| 房间数据 | 一次返回本房间完整记录；当前前端按 50 条逐步显示，编号与筛选均基于完整数据 |
| 重复记录 | 不按 behavior_id、用户或文案去重 |
| 数据缺失 | 保留未知；不要返回模拟记录冒充真实源 |

该版本没有服务端分页。改成分页接口时，需要同步修改前端编号、筛选计数和相邻间隔逻辑。

## 错误

- 不支持的 source：HTTP 422（框架参数校验）。
- 源文件缺失 / 无法解析：HTTP 503，`{"detail":"可展示的错误说明"}`。
- 不存在的主播或房间：HTTP 200，records 为空数组。
- 页面和静态资源仅开放约定路径，其余返回 HTTP 404。
