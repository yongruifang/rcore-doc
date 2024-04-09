---
title: 7. riscv-mini新增指令
icon: circle-plus
headerDepth: 3
---
## 目标
- 在riscv-mini的基础上新增一个指令

## 内容
1. 修改数据通路，新增指令
`comb rs1,rs2,rd` R型，
combine 拼接，将rs1高16位和rs2低16位拼接成32位，保存到rd

2. 执行该指令，观察仿真波形，验证功能。
