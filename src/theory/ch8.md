---
title: 8. 单周期实现
icon: hashtag
---

# 指令集模块化。

开发方式：模块型。

将ISA按照功能分割，用户可以根据需要 选择任意功能 进行集成。

对比增量型开发：区别：
- 是否实现不必要的功能？

模块型：更容易减少电路规模，实现低功耗，低成本的硬件。

实验也可以按照模块型开发的思路进行渐进式开发。
依次实现：
1. 基本整数指令模型 I 
2. 部分向量扩展指令模型 V 
3. 管理控制和状态寄存器的CSR扩展指令模块 Zicsr 


# 如何进行Chisel设计
1. 取指令实现。
描述取指令电路。并进行测试。

2. 指令译码实现 
描述译码电路。并进行测试。

分指令实现。步骤分化为：
2.1. lw指令 

2.2. sw指令

2.3 add, sub 

2.4 logic

- 思考：是否可以高速整合？

2.5 优化译码器，引入。是否可以直接引入？不必。

2.6 移位

2.7 比较 

2.8 分支 

2.9 跳转 

2.10 LUI指令 

2.11 CSR指令

2.12 ECALL 

2.13 测试包的引入：riscv-tests 

2.14 测试通过以后，试运行 汇编程序，试着运行 C程序。
目标：在自制CPU上运行C程序。



