# 自写消息与状态模型

本包没有可玩的消息/剧情预设。`config/scenario.json` 只包含空 `nodes` 数组，`scenarioFile` 默认 `null`。不想写剧情时保持原样即可。

1.2 版新增无需修改源码的 [内容工作室](SCRIPT_STUDIO.md)：可让 AI 改编自己的脚本，或手写聊天、剧情节点、各平台帖子。草稿中的结构化剧本包与下面的编译期配置格式不同。

下面是原有作者节点模式的说明。1.1 版另有可选 [AI 角色与控制台](AI_SETUP.md)，默认关闭；AI 不覆盖正在等待选择的作者节点。

## 启用自己的内容

1. 在 `contacts` 中自行添加参与者，记录其唯一 `key`。
2. 自己填写 `config/scenario.json` 的 `id`、`title` 和 `nodes`。
3. 在 `phone.config.json` 的 `overrides` 设置 `"scenarioFile": "config/scenario.json"`。
4. 校验、构建，用新存档测试。开始页会显示“作者配置”卡片，点击“启动配置剧情”后送达开场消息；进入手机或保存人物设定不会自动启动。空节点不会启动任何主线。

这里提供结构说明，不附带人物或对话故事。

## 节点字段

| 字段 | 类型及含义 |
| --- | --- |
| `id` | 唯一英文字母/数字/短横线/下划线标识 |
| `title` | 消息段落的名称 |
| `contact` | `contacts` 中的 `key` |
| `app` | `kakao`、`instagram`、`x` 或 `weverse`；对应应用需保留桌面入口 |
| `dependsOn` | 前序节点 ID 数组；省略时依赖上一个节点，首节点默认无依赖 |
| `lines` | 作者编写的消息数组，不能为空，第一条必须为 NPC |
| `choice` | 可选关键选择对象 |
| `variants` | 根据之前选择替换本节点部分消息 |
| `flag` | 可选公开事件标识，用于 `publicTexts` |
| `priority` | 可选通知优先级，数值越大优先级越高 |

每条 `lines` 使用 `role: "npc"` 或 `"player"`，`text` 为正文，`translation` 可填中文翻译。韩文/日文 NPC 消息必须提供 `translation`。普通玩家回复完全来自作者文本，不是 AI 生成。

`choice` 含 `prompt` 和 `options`。`options` 是 2–5 个三项数组：`[选项ID, 玩家显示的回复, NPC的回应]`，选项 ID 不重复。

`variants` 每项包含 `nodeId`、`value`、`lineIndex`、`text`，可选 `translation`：当之前 `nodeId` 的选择值等于 `value` 时，替换当前节点中从 0 开始的 `lineIndex` 行。作者应只引用实际的前序选择节点，确保依赖链使该选择先发生。

`publicTexts` 是场景顶层对象，按 `flag` 映射到作者自己的公开文字。节点完成后若有匹配文字，会产生对应平台的公开记录；未配置的标识不自动编造讨论。

## 状态与推进

人物/关系在 `state.story.characters`、`relationships`、`slots`；账号内容在 `state.accounts[平台][索引]`；私聊在 `state.conversations` 和对应账号 `dms`；自写节点在 `state.story.mainline.queue`。

节点状态为 `locked → available → notified → opened → waiting_choice / completed`。普通消息逐条展示，关键选择等待点击；只有依赖节点完成，后继才送达。时间用于气泡节奏，不承担章节解锁条件。

可以离开消息去使用其他应用，节点和选择随本地存档保存，返回时继续；浏览器关闭后不会有后台线程。空白版不会生成定时来信、自动社交世界或自动 NPC 回复。若要接入自己的互动规则，主要扩展点在 `src/template-runtime.js` 的 `storyHandleInput`、`scheduleKakaoGroupReply`、`worldInteraction` 等函数。

## 修改注意

- 同一条消息在不同社交账号下的数据分别保存，引用时带上平台与账号索引。
- 不把别的平台的私信直接变成公共内容；公开传播只使用你明确配置的内容。
- 更新正在进行的剧情结构后，旧存档中的队列不会被强制重写。换命名空间或备份后重置，验证全新起点。
- 引擎不自动生成无限后续，没有隐藏的“下一季”。全部节点完成即结束作者当前提供的内容。
- 校验会检查缺失联系人、未知应用、无效依赖、循环依赖、选项结构、外语翻译和基本变体字段。作者仍需走完自己的各个分支检查叙事与体验。
