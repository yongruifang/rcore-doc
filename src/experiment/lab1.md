---
title: 1. MIPS lab
icon: tag
headerDepth: 3
---
## 目标
- 了解WinMIPS64的基本功能和作用
- 掌握MIPS指令、初步建立指令流水线执行的感性认识
- 掌握工具的基本命令和操作，为流水线实验做准备。

## 内容
1. 下载WinMIPS64，运行样例代码，观察各个窗口的展示。
2. 使用WinMIPS64的IO方法。
3. 编写完整的sort程序

## 软件介绍
WinMIPS64官网: `indigo.ie/~mscott/`  
软件下载: `indigo.ie/~mscott/winmips64.zip`  
文档下载: `http://indigo.ie/~mscott/winmipstut.docx`  

## 快速上手
### 1. 启动与配置
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
:::details 配置详情
```bash
code address bus: 10
data address bus: 10
FP addition latency: 4 
FP multiplier latency: 7
FP division latency: 24
```
:::
configure菜单还有其他四个配置
- [ ] multi-step
- [ ] enable forwarding
- [ ] enable branch target buffer
- [ ] enable delay slot  

>[!warning]
> **本次实验 不勾选 enable forwarding**

### 2. 加载测试程序
- 编辑测试程序 **sum.s**
:::details sum.s
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
:::
- 检查语法  
**winmips** 文件夹内有 **asm.exe**, 用于语法检查
```bash
进入文件夹
执行命令 ./asm.exe sum.s
```
- 加载程序
<kbd>file->open</kbd>

### 3. 模拟  

::: info 如何设置断点? 
在**Code窗口**, 对指令所在行双击左键，指令变成<font color="blue">蓝色</font>代表断点生效。  
点击<kbd>run to</kbd>会将时钟周期推进到下一个断点。
:::

> [!tip] 
> 指令在流水线不同阶段会呈现不同颜色

<kbd>execution > single cycle</kbd> : 逐步运行  
<kbd>execution > multi cycle</kbd>  :  一次执行五个周期  
1. 到第五个时钟周期的时候观察`dadd r3, r4, r5`  
2. 没有从Decode 跳转到 Execute, 也就是<u>没有从<font color="blue">蓝色</font>变成<font color="red">红色</font></u>  
3. 而是停留在 Decode阶段。仍然是<font color="blue">蓝色</font>。    
4. 终端显示 `RAW stall in ID (RS)`  
`sd r3, C(r0)`指令也保持黄色(Fetch阶段)  

5. 此刻的**Cycles窗口**发生的**数据相关**冒险  
第五条指令需要读取r5的值,  
而`ld r5, B(r0)`在这个时钟周期需要对r5进行写回，<b> 下一周期才允许读取r5</b>。  
启用forwarding可以解决这个问题。  





## 任务1. print "Hello World!"
编辑**echo.s**, 在终端打印`"Hello World!"`
> CONTROL 和 DATA 是使用终端输入输出的关键
::: details echo.s
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
:::
## 任务2. bubble sort
- 对一组整型数组进行冒泡排序
- 要求实现swap函数
- 数据样例: `array: .word 8,6,3,7,1,0,9,4,5,2`
### 分析
需要对十个数进行排序，要求在sort函数中调用swap，使用栈的思想，在函数嵌套时保存$a的值。
> 注意: 需要将SP初始化为内存最高地址，否则初始化为0，使得SP-1将会指向0xffffffff，导致超出winmips默认的内存空间。 

::: details 最后终端的打印结果应该是:
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
:::
### 代码实现
::: details bubble_sort.s
```asmatmel
.data
array: 	.word 8,6,3,7,1,0,9,4,5,2
size:	.word 10
CONTROL: .word32 0x10000
DATA:	.word32 0x10008
before:	.asciiz "before sort the array is:\n"
after: 	.asciiz "after sort the array is:\n"

.text
main:
  daddi r29,r0,0x03f8
	daddi r1,r0,before
	lw r2,DATA(r0)
	sw r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sw r1,0(r2)

	jal show

	jal sort

	daddi r1,r0,after
	lw r2,DATA(r0)
	sw r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sw r1,0(r2)

	jal show

	halt

show:
	daddi r29,r29,-16
	sw r1,12(r29)
	sw r2,8(r29)
	sw r3,4(r29)
	sw r4,0(r29)

	lw r4,size(r0)
	daddi r1,r0,0
loop1:
	dsll r3,r1,3
	lw r2,array(r3)
	lw r3,DATA(r0)
	sw r2,0(r3)
	daddi r2,r0,2
	lw r3,CONTROL(r0)
	sw r2,0(r3)
	daddi r1,r1,1
	bne r1,r4,loop1

	lw r4,0(r29)
	lw r3,4(r29)
	lw r2,8(r29)
	lw r1,12(r29)
	daddi r29,r29,16
	jr r31	

swap:	
  daddi r29,r29,-16
	sw r8,12(r29)
	sw r9,8(r29)
	sw r10,4(r29)
	sw r31,0(r29)

	dsll r9,r5,3
	dadd r9,r4,r9
	lw r8,0(r9)
	lw r10,8(r9)
	sw r10,0(r9)
	sw r8,8(r9)

	lw r31,0(r29)
	lw r10,4(r29)
	lw r9,8(r29)
	lw r8,12(r29)
	daddi r29,r29,16
	jr r31
	
sort:	
  daddi r29,r29,-28
	sw r31,24(r29)
	sw r1,20(r29)
	sw r2,16(r29)
	sw r3,12(r29)
	sw r8,8(r29)
	sw r9,4(r29)
	sw r10,0(r29)
	
	lw r10,size(r0)
	daddi r10,r10,-1
	daddi r1,r0,0
loop2:
	daddi r2,r0,0
loop3:
	dsll r3,r2,3
	lw r8,array(r3)
	daddi r3,r3,8
	lw r9,array(r3)
	slt r3,r8,r9
	bnez r3,fine
	dadd r5,r2,r0
	daddi r4,r0,array
	jal swap
fine:
	daddi r2,r2,1
	bne r2,r10,loop3
	daddi r1,r1,1
	bne r1,r10,loop2
	
	lw r10,0(r29)
	lw r9,4(r29)
	lw r8,8(r29)
	lw r3,12(r29)
	lw r2,16(r29)
	lw r1,20(r29)
	lw r31,24(r29)
	daddi r29,r29,28
	jr r31
```
:::
