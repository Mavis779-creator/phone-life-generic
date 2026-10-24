# 配置说明

配置均为 UTF-8 JSON。没有注释和尾随逗号。编辑完成后运行 `python scripts/build.py --validate`，再运行 `python scripts/build.py`。

## 配置层级

`config/phone.config.json` 是唯一入口：

```json
{
  "schemaVersion": 1,
  "preset": "blank",
  "storageNamespace": "phone-life-blank-v1",
  "overrides": {}
}
```

`blank` 仅表示空白初始化配置。本包没有日常剧情/爱豆剧情预设。底层默认值在 `config/presets/blank.json`，`overrides` 会按对象递归合并；数组整体替换，不逐项合并。

开发自己的分支时，把 `storageNamespace` 换成自己的唯一小写标识，例如 `my-phone-project-v1`。长度 3–64，支持小写字母、数字、短横线，不允许原版的 `idol-phone-life` 前缀。命名空间影响文字和媒体两种存储，不会搬迁旧数据。

## 常用修改

例如只改默认身份、密码和余额，在 `overrides` 中填写：

```json
{
  "app": {"title": "我的手机", "defaultPin": "1234"},
  "player": {"realName": "自己的姓名", "stageName": "自己的显示名"},
  "accountHandle": "my_name",
  "profileBio": "自己的介绍",
  "wallet": {"initialBalance": 20000000}
}
```

以上仅展示字段，不会自动写入实际配置。`defaultPin` 必须保留引号，是四位数字字符串。`accountHandle` 使用字母、数字、点、短横线或下划线。余额为非负整数，单位韩元。

## 顶层字段

| 字段 | 用途 |
| --- | --- |
| `app.title`、`app.hero` | 入口品牌文字与说明 |
| `app.defaultPin` | 新存档的默认四位密码 |
| `player` | 默认档案；只在初次创建存档时应用 |
| `accountHandle`、`profileBio` | 默认社交账号用户名与简介 |
| `contacts` | 初始联系人数组；本包为空 |
| `desktopPages` | 两页应用列表，每页 1–16 项 |
| `scenarioFile` | 自写消息 JSON 的相对路径；`null` 为关闭 |
| `wallet.initialBalance` | 玩家卡初始余额 |
| `wallet.addressLabel`、`wallet.address` | 初始收货地址的名称、文本 |
| `assets.avatar`、`assets.wallpaper` | 目录内图片相对路径；空字符串为默认效果 |
| `calendar` | 初始日历数组；本包为空 |

`player` 的可编辑字段：`realName`、`stageName`、`koreanName`、`gender`、`age`、`nationality`、`company`、`groupName`、`groupType`、`roleInGroup`、`debutYears`、`popularityTier`、`fandomName`、`languages`、`publicImage`、`privatePersonality`。

年龄 1–120；`debutYears` 为 0 到年龄的整数；`roleInGroup` 和 `languages` 使用数组。`groupType` 支持 `solo` / `group` / `group+solo`；`popularityTier` 保留 `trainee` / `rookie` / `rising` / `top` / `superstar` 结构值。不做爱豆版本也可保留默认结构，不会因此生成内容。

## 人物

`contacts` 支持 0–100 人。每人包含 `key`、`name`、`handle`、`slot`，可选 `profession`、`bio`、`familyRelation`、`isPublicFigure`。`key`、`handle` 必须唯一；`key` 仅用字母、数字、短横线、下划线。新存档会创建 ID 为 `custom-<key>` 的人物。

关系 `slot` 对照：

| 值 | 界面含义 |
| --- | --- |
| `familyMembers` | 家人 |
| `nonIndustryFriends` | 生活好友 |
| `industryFriends` | 同事与同行 |
| `manager` | 协调人/经纪人，可不设置 |
| `staff` | 项目伙伴/工作人员 |
| `groupMembers` | 团队同伴 |
| `brandContacts` | 合作联系人 |
| `pdDirectorsProducers` | 策划与创作 |
| `boyfriend` | 伴侣，最多一人 |
| `exPartners` | 过去的关系 |
| `flirtTargets` | 想进一步认识的人 |
| `secretAdmirers` | 尚未表明心意 |
| `maleIdolsWhoInitiateContact` | 新认识的人 |

添加人物不会自动添加开场消息或定时问候。页面里添加人物同样有效，无需修改 JSON。

## 桌面与日历

应用项使用 `[应用ID, 显示名, 样式类]`。可以改变顺序、显示名称或隐藏应用；隐藏只移除桌面入口，不会卸载相应模块和已有数据。保留 `kakao`、`settings`、`notifications`，不重复 ID。

支持 ID：`calendar`、`photos`、`kakao`、`instagram`、`mail`、`notes`、`safari`、`applemusic`、`phone`、`company`、`notifications`、`settings`、`x`、`threads`、`tiktok`、`weverse`、`youtube`、`camera`、`maps`、`gmail`、`files`、`voicememos`、`reminders`、`shop`、`delivery`。样式类可沿用默认值。

日历项含 `title`、`date`、`time`、`location` 字符串，例如日期 `2026-10-25`、时间 `14:00`；本包不设固定日程。地图地点在 `src/scenario.js` 中修改。

## 素材与音乐

把头像或壁纸放进项目自己的 `src/assets/custom/`，再配置相对路径。构建会将头像/壁纸嵌入 HTML，不允许跨出工程目录读取图片。

`config/music.library.json` 默认 `tracks: []`。歌曲元数据字段为 `title`、`artist`、`duration`（正数，秒）、`audio`（通常留空），可选 `album`、`lyrics`。建议通过页面的“导入新歌曲”选择实际音频，避免绝对路径与跨域问题。仅填元数据不会附带音源。高级修改若在 `audio` 指定 URL/相对路径，须自行处理路径、访问权限与离线可用性，构建不会自动嵌入歌曲文件。

商品目录在 `src/assets/shop/catalog.json`。每件商品的 `variants` 中价格需为正整数韩元，保留 `source`、`checkedAt` 等审核字段，否则构建或商品过滤会拒绝该条目。素材清单的 SHA256 检查用于防止图片被误改；替换相应图片时同步更新清单。

## 存档更新策略

默认配置不会反复覆盖已有玩家资料、联系人或密码。修改后要验证新安装效果：先导出旧存档，再通过页面重置本版，或换一个新命名空间重建。不要清空整个浏览器存储，也不要删除原版数据。

`python scripts/build.py --output-dir build-checks/preview` 可输出到本工程内的独立检查目录。禁止把输出目录指向工程外部；这有助于避免覆盖原版。`build-checks/` 不包含在发布包中。
