---
name: AI 面试陪练 · 浅色工作台
description: 仅适用于 ai-interview 面试项目，不适用于作品集及其他页面。
colors:
  primary: "#21664d"
  primary-deep: "#194d3b"
  bg: "#f6f8f7"
  rail: "#edf2ef"
  panel: "#ffffff"
  panel-2: "#f4f7f5"
  ink: "#202f2a"
  muted: "#5f7168"
  line: "#dce4df"
  warning: "#98601b"
  error: "#b43a35"
  field-bg: "#fcfdfc"
  field-border: "#cedbd3"
  nav-active-bg: "#d9e9df"
  nav-active-text: "#174f3a"
  chip-bg: "#e7efe9"
  chip-text: "#305744"
typography:
  headline:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.45
    letterSpacing: "-.025em"
  title:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "17px"
    fontWeight: 650
  body:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "15px"
    lineHeight: 1.6
  label:
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "12px"
rounded:
  chip: "4px"
  control: "8px"
  container: "12px"
spacing:
  compact: "8px"
  action: "16px"
  panel: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  text-button:
    backgroundColor: "transparent"
    textColor: "#385945"
    rounded: "{rounded.control}"
    padding: "12px 6px"
  input:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "14px"
  nav:
    backgroundColor: "{colors.nav-active-bg}"
    textColor: "{colors.nav-active-text}"
    rounded: "{rounded.control}"
    padding: "14px 12px"
  chip:
    backgroundColor: "{colors.chip-bg}"
    textColor: "{colors.chip-text}"
    rounded: "{rounded.chip}"
    padding: "5px 9px"
---

# Design System: AI 面试陪练

## Overview

**Creative North Star: "清爽的浅色工作台"**

白色内容、浅灰导航和深石墨正文构成安静、可扫描的任务环境。森林绿提示当前步骤与主要动作；控件克制明确，视觉层级来自文字、间距和分隔，不来自装饰。

本文件只约束 `ai-interview.html`、`ai-interview.css` 及面试项目的相关 UI；不定义作品集的视觉系统。基于已确认方向与当前 CSS 扫描记录，不宣称自动引擎验证。

**Key Characteristics:**

- 浅色、平面、以内容为中心。
- 森林绿标识动作与当前状态。
- 紧凑辅助信息，宽松输入与阅读空间。

## Colors

低饱和绿色与带绿倾向的中性色配合，保持长文本阅读的平静。

### Primary

森林绿用于主按钮、焦点、当前流程和评分标记；深森林绿用于主按钮悬停。

### Neutral

背景、导航轨道、白色内容与次级面构成轻微色阶。深石墨承担正文，柔和灰绿承担提示，细分隔色承担边框。

警示棕与错误红是语义状态，不是额外品牌强调色；文本必须解释状态。输入与步骤选中面的专用色以 frontmatter 为准。

**The State, Not Decoration Rule.** 强调色服务动作或状态，不用于无意义装饰。

## Typography

全界面使用系统无衬线栈，优先 Segoe UI，并使用 Microsoft YaHei、PingFang SC 与 sans-serif 回退。没有独立展示字体或真实等宽字体；数字通过 tabular-nums 对齐。

标题明确但不宣传化：页面标题使用 headline，输入分区标题使用 title，正文使用 body，辅助信息使用 label。输入文字行高更宽（1.8）；手机输入字号增加（16px），手机首屏标题缩小（23px）。问答和报告保留各自已实现的标题尺寸，不强行归并为展示标题。

## Layout

桌面采用窄导航（224px）与弹性工作区。内容最大宽度（1260px）；工作区横向留白（44px）。表单桌面双栏，共享一个边框容器；旁侧说明为紧凑独立栏。常用面板内距采用 panel，区块间距采用 section，操作间距采用 action。

在 max-width（1200px）下，输入双栏堆叠，工作区横向留白降至（28px）。在（900px）下，侧导航变为顶部四步流程，分析和问答改为单栏；隐私说明迁移到表单下方，不能随侧栏说明一起消失。在（680px）下，准备说明与报告栅格堆叠，工作区横向留白为（18px），操作可纵向排列。

## Elevation & Depth

没有阴影或玻璃层。白色内容面、浅色上下文面与细边框构成平面层级；不加入渐变、霓虹或装饰动画。状态只做短促背景、边框与透明度过渡（.18s）；尊重 reduced-motion，将动画和过渡缩至（.01ms）。

## Shapes

控件采用柔和但紧凑的圆角，内容容器稍大，证据标签更小；具体尺度以 rounded 为准。内容面与输入采用单像素边框。模型状态点是小圆点，不扩张为装饰性大徽章。

## Components

### Buttons

主按钮为实心森林绿、白字，字号（14px）、字重（600），无位移或阴影；悬停变深。禁用改为中性灰绿，不可点击。文本按钮透明、字重（500），悬停显示轻微浅绿色底。次级按钮使用浅绿底而非第二种高饱和色。交互目标至少（44px）高。

### Chips

证据标签为小号浅绿块，无阴影。匹配及审计标签可用绿、棕、红表达已有证据、推断与未知，必须配合文字，不能只靠颜色。

### Cards / Containers

输入、对话和报告采用白色面、细线边框与 container 圆角；常规内距为 panel，对话桌面内距（32px）。风险或下一步容器使用轻微绿色色阶，仍不加阴影。

### Inputs / Fields

多行文本域使用柔白底、细灰绿边框，可纵向调整高度。聚焦边框变为森林绿；键盘焦点采用（2px）外轮廓，输入偏移（2px），其他交互控件偏移（4px）。标签和辅助信息与文本域保持分离；错误为明确红色文字。

### Navigation

当前步骤使用浅绿底与深绿文字，非当前步骤保持透明。可用步骤悬停显示浅灰绿底；未来步骤禁用。手机保持四个步骤可扫描，隐藏次级说明而非关键流程或隐私信息。报告深度选项通过底线与字重表达选中。

## Do's and Don'ts

### Do:

- Do 保持浅色、平面、以内容为中心的工作台。
- Do 让森林绿承担主动作、焦点和当前状态。
- Do 保留清晰键盘焦点、至少 44px 的操作目标与手机隐私说明。
- Do 用文字解释错误、未知与评分依据。

### Don't:

- Don't 将本系统应用到作品集其他页面。
- Don't 加入霓虹、玻璃、渐变、阴影或装饰动画。
- Don't 将旧命名 cyan 或 mono 解读为青色品牌或等宽字体。
- Don't 把“已完成练习”等同于能力优秀，或把历史缺陷写成系统规则。
