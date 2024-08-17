---
title: 7. 新增M扩展指令集
icon: circle-plus
headerDepth: 3
description: 基于riscv-mini, 新增MDU，并进行功能验证。
tag: [riscv-mini, chisel]
---
## 引言
要实现RISC-V的定制或扩展指令，需要从三个方面入手：  
（1）定义指令集，确保兼容已有实现的指令编码；  
（2）修改软件，主要涉及riscv-gnu-toolchain工具包中的GCC和binutils工具；  
（3）修改硬件，主要包括对流水线功能部件的改动和扩充。  
<!-- <abbr title="Multiplication Division Unit, 乘除法单元">MDU</abbr>模块的作用 -->
*[MDU]: Multiplication Division Unit 

MDU 模块的功能是完成乘法、除法、取余相关的运算。  

![指令位配置](/assets/image/lab7/指令位配置.png "指令位配置" =x100)
<!-- <figure style="background: red;"> -->
<!--   <img src="/assets/image/lab7/指令位配置.png" height="100" style="margin-left: 0px;"> -->
<!--   <figcaption style="margin-left: 150px;">指令位配置</figcaption> -->
<!-- </figure> -->
<!-- <img src="/assets/image/lab7/指令位配置.png" height="100" ></img> -->
<!-- ![指令位配置](/assets/image/lab7/指令位配置.png "指令位配置" =x100) -->
根据<u>有无符号</u>和<u>位数</u>的不同，最终产生了8条<abbr title="所有指令均为R型指令">相关指令</abbr>：
<div style="width: 75%; margin-left: auto;"> 

| 指令 | 行为 |
| ------ | ----------- |
| mul | 有符号数相乘，保存较低的 32 位 |
| mulh | 有符号数相乘，保存较高的 32 位 |
| mulhsu | 有符号数乘无符号数，保存较高的 32 位 |
| mulhu | 无符号数相乘 ，保存较高的 32 位 |
| div |有符号数相除  |
| divu |无符号数相除 |
| rem  |有符号数取余 |
| remu |无符号数取余 |
  
</div>

:::info 针对除法
还需要考虑异常情况下的输出规定，比如在除以0和除法溢出时的处理。
| 条件 | 被除数 | 除数 | divu | remu | div | rem |
| --- | --- | --- | --- | --- | --- | --- |
|除以0 |x | 0 | $2^{xlen-1}$ | x | -1 | x | 
| 溢出(有符号) | $-2^{xlen-1}$ | -1 | | | $-2^{xlen-1}$ | 0 |
:::


## 目标
- 在riscv-mini的基础上新增MDU模块
- 编写程序，验证功能。

## 内容
1. 修改数据通路，新增MDU模块  

2. 重新编译VTile, 测试指令，观察仿真波形，验证功能。

3. 扩展实验: 新增comb指令  

`comb rs1,rs2,rd` 
- 类型：R型，
- 功能： 将rs1高16位和rs2低16位拼接成32位，保存到rd

## 步骤
### 1. 常量模块补充MDU单元
八条指令理论上只需要3bit的信号即可识别，添加MDU_XXX是为了表示非MDU指令
:::code-tabs #shell 
@tab MDU常量单元
```scala 
object Mdu {
 val MDU_FUN_LEN = 4
 val MDU_XXX = 0.U(MDU_FUN_LEN.W)
 val MDU_MUL = 1.U(MDU_FUN_LEN.W)
 val MDU_MULH = 2.U(MDU_FUN_LEN.W)
 val MDU_MULHSU = 3.U(MDU_FUN_LEN.W)
 val MDU_MULHU = 4.U(MDU_FUN_LEN.W)
 val MDU_DIV = 5.U(MDU_FUN_LEN.W)
 val MDU_DIVU = 6.U(MDU_FUN_LEN.W)
 val MDU_REM = 7.U(MDU_FUN_LEN.W)
 val MDU_REMU = 8.U(MDU_FUN_LEN.W)
}
```
:::


### 2. 执行阶段

参考手册上对于MDU各个指令的运算规则

|指令|运算规则|<div style="width: 250px;">表达式</div>|
|---|---|---|
|MUL|执行 rs1，rs2 的乘法操作，忽略算术溢出，只将低 XLEN 位的值写入 rd 寄存器中| (op1.asSInt * op2.asSInt)(31, 0) |
|MULH| 执行 rs1，rs2 的乘法操作，但在执行操作之前，需要将 rs1，rs2 分别进行 2 倍 XLEN 位的有符号数扩展，将计算结果的高 XLEN 位写入 rd 寄存器| (op1.asSInt * op2.asSInt)(63, 32)| 
|DIV| 执行 rs1/rs2 操作，结果写入寄存器。在执行除法操作前，将 rs1，rs2 寄存器进行 XLEN 位的有符号数扩展| (op1.asSInt / op2.asSInt)(31, 0) <br/>当除数为0 为(-1.S(32.W)).asUInt| 
|DIVU| 与 DIV 类似，但在执行除法操作前，将 rs1，rs2 进行 XLEN 位的无符号位扩展| op1.asUInt / op2.asUInt <br/>当除数为 0 为(-1.S(32.W)).asUInt|
|MULHU |与 MULH 类似，但在执行乘法指令之前，将rs1，rs2 进行 2 倍 XLEN 位的无符号数扩展| (op1.asUInt * op2.asUInt)(63, 32) |
|MULHSU |和 MULH 指令类似，但在执行乘法指令之前， 将 rs1 进行 2 倍 XLEN 位的有符号数扩展，将 rs2 进行 2 倍 XLEN 位的无符号数扩展| (op1.asSInt * op2.asUInt)(63, 32) |
|REM |执行 rs1%rs2 操作，将结果写入 rd 操作，但在执行取余操作之前，将 rs1，rs2 进行 XLEN 位的有符号数扩展| (op1.asSInt % op2).asUInt <br/> 当除数为 0 为 op1|
|REMU|和 REM 指令类似，但在执行取余操作之前，将 rs1，rs2 进行 XLEN 位的无符号数扩展| op1 % op2 <br/>当除数为 0 为 op1|

