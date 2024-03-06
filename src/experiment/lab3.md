---
title: 3. Chisel编程(实现取指译码)
icon: tag
headerDepth: 3
---
## 目标
1. 设计一个连续取指+译指的电路
2. 入门简单数据通路
3. 运用chisel语法编写模块

## 内容
### 1. 译码器的设计
完成add, sub, lw, sw指令译码。其他指令一律译为nop
```normal
Input: Instr_word[31:0]
Output: 
    add_op
    sub_op
    lw_op
    sw_op
    nop
```
实现代码，完成波形仿真测试。
指令测试样例：
```asmatmel
add r1, r2, r3
sub r0, r5, r6
lw r5, 100(r2)
sw r5, 104(r2)
jal 100
```

### 2. 寄存器文件的设计
32-bit的寄存器 x 32 
允许两读一写
- r0固定读出0
- 输入端口 
```normal
rs1, rs2, wb_data, reg_wb, rf_wren
```
- 输出端口
```normal
rs1_out, rs2_out
```
- 寄存器内部保存的初始数值设置为寄存器编号

测试
```normal
rs1=5, rs2=8, wb_data=0x1234, reg_wb=1, rf_wren=1 
观察输出波形以及对应寄存器的值
```

### 3. 模块的组合
实现32-word的指令存储器。
地址0存储4条指令。
```asmatmel
add r1, r2, r3
sub r0, r5, r6
lw r5, 100(r2)
sw r5, 104(r2)
```
- 组合 指令存储器，寄存器文件，译码器。
PC初始值为0  
目标：逐条地取指、译码。  
观察四条指令的执行过程的波形
