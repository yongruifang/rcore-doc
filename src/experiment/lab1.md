---
title: 1. MIPS lab
icon: tag
headerDepth: 3
---

## lab1: MIPS指令集实验

### 目标
- 了解WinMIPS64的基本功能和作用
- 掌握MIPS指令、初步建立指令流水线执行的感性认识
- 掌握工具的基本命令和操作，为流水线实验做准备。

### 内容
1. 下载WinMIPS64，运行样例代码，观察各个窗口的展示。
2. 使用WinMIPS64的IO方法。
3. 编写完整的sort程序

### 软件介绍
WinMIPS64官网: `indigo.ie/~mscott/`  
软件下载: `indigo.ie/~mscott/winmips64.zip`  
文档下载: `http://indigo.ie/~mscott/winmipstut.docx`  

### 快速上手
#### 1. 启动与配置
- 七个子窗口  
    (1) pipeline 流水线：观察指令所在阶段  
    (2) code 代码：地址、内容、汇编指令  
    (3) data 数据：内存地址、数据。双击可编辑  
    (4) registers 寄存器：颜色代表状态，双击可编辑  
    (5) statistics 指标统计  
    (6) cycles 时钟周期  
    (7) terminal 终端：负责程序的输入/输出 
- 重置: <kbd>file > reset MIPS64</kbd>  
- 架构配置: <kbd>configure > architecture</kbd>
```bash
code address bus: 10
data address bus: 10
FP addition latency: 4 
FP multiplier latency: 7
FP division latency: 24
```
configure菜单还有其他四个配置
- [ ] multi-step
- [ ] ~~enable forwarding~~
- [ ] enable branch target buffer
- [ ] enable delay slot  
**本次实验 不勾选 enable forwarding**

#### 2. 加载测试程序
- 编辑测试程序 sum.s
```asmatmel
.data
A:  .word 10
B:  .word 8
C:  .word 0
.text
main:
ld  r4, A(r0)
ld  r5, B(r0)
dadd    r3, r4, r5
sd  r3, C(r0)
halt
```
- 检查语法
winmips文件夹内有asm.exe, 用于语法检查
```bash
进入文件夹
执行命令 ./asm.exe sum.s
```
- 加载程序
<kbd>file->open</kbd>

#### 3. 模拟  
> **本次实验 不勾选 enable forwarding**  

<kbd>execution > single cycle</kbd>  

指令在流水线不同阶段会呈现不同颜色

- 注意: 到第五个时钟周期的时候看`dadd r3, r4, r5`  
该指令没有从Decode 跳转到 Execute, 也就是没有从蓝色变成红色。而是停留在 Decode阶段。仍然是蓝色。  
终端显示 `RAW stall in ID (RS)`  
`sd r3, C(r0)`指令也保持黄色(Fetch阶段)  

- 目光转移到**Cycles窗口** 
因为发生了数据相关。第五条指令依赖r5，但是r5的值此时不可用。  
之所以不可用，是因为没有启用forwarding, 刚好`ld r5, B(r0)`在这个周期是r5的写回阶段，下一周期才允许读取r5.  

<kbd>execution > multi cycle</kbd>  
- 一次执行五个周期，无视断点
- 可以设置断点，在**Code窗口**对指令所在行双击左键，指令变成蓝色代表断点生效。点击<kbd>run to</kbd>会将时钟周期推进到下一个断点。

### 任务1. print "Hello World!"
编辑echo程序, 在终端打印"Hello World!"
#### CONTROL 和 DATA 是使用终端输入输出的关键
```asmatmel
.data
str:      .asciiz "Hello World!"
CONTROL:  .word32 0x10000
DATA:     .word32 0x10000
.text
main:
lwu r31, CONTROL(r0)
lwu r30, DATA(r0)
daddi r29, r0, 4
daddi r28, r0, str ; 
sd  r28, (r30)  ; DATA <- address of string
sd  r29, (r31)  ; control mode <- 4
halt
;解释
;Set CONTROL = 
; 1 ~ 5, will set DATA to specify output
;1, to Unsigned Integer
;2, to signed Integer
;3, to floating point
;4, to address of string
;5, DATA + 5 to x 坐标, DATA + 4 to y 坐标, DATA to RGB 颜色
;6, clears the terminal screen
;7, clears the graphics screen
;8, read the DATA from the keyboard
;9, read one byte from DATA, no character echo.
```
### 任务2. bubble sort
- 对一组整型数组进行冒泡排序
- 要求实现swap函数
- 数据样例: `array: .word 8,6,3,7,1,0,9,4,5,2`
#### 分析
需要对十个数进行排序，要求在sort函数中调用swap，使用栈的思想，在函数嵌套时保存$a的值。
最后终端的打印结果应该是:
```bash
before sort the array is:
8
6
3
7
1
0
9
4
5
2
after sort the array is:
0
1
2
3
4
5
6
7
8
9
```
#### 代码实现
```asmatmel

```
