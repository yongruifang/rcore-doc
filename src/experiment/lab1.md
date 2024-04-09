---
title: 1. MIPS lab
icon: unlock
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
[下载winmips64](https://indigo.ie/~mscott/winmips64.zip)
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
```bash:no-line-numbers
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
> **winmips** 文件夹内有 **asm.exe**, 用于语法检查
:::details sum.s
:::code-tabs #shell
@tab sum.s
```asmatmel
.data   
A:  .word   10
B:  .word   8
C:  .word   0
.text   
main:
    ld      r4, A(r0)
    ld      r5, B(r0)
    dadd    r3, r4,     r5
    sd      r3, C(r0)
    halt    
```
@tab 语法检查 
```bash {2}
D:\winmips64>asm.exe program\sum.s
Pass 1 completed with 0 errors
00000000          .data   
00000000 000000000000000a A:  .word   10
00000008 0000000000000008 B:  .word   8
00000010 0000000000000000 C:  .word   0
00000000          .text   
00000000          main:
00000000 dc040000     ld      r4, A(r0)
00000004 dc050008     ld      r5, B(r0)
00000008 0085182c     dadd    r3, r4,     r5
0000000c fc030010     sd      r3, C(r0)
00000010 04000000     halt    

Pass 2 completed with 0 errors
Code Symbol Table
                main = 00000000
Data Symbol Table
                   A = 00000000
                   B = 00000008
                   C = 00000010


```
:::

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
:::tip CONTROL 和 DATA 是使用终端输入输出的关键
:::

::: details echo.s
:::code-tabs #shell
@tab echo.s
```asmatmel
.data   
str:        .asciiz "Hello World!"
CONTROL:    .word32 0x10000
DATA:       .word32 0x10008
.text   
main:       
    lwu     r31,    CONTROL(r0)
    lwu     r30,    DATA(r0)
    daddi   r29,    r0,             4
    daddi   r28,    r0,             str 
    sd      r28,    (r30)                       ; DATA <- address of string
    sd      r29,    (r31)                       ; control mode <- 4
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
@tab 语法检查
```bash {2}
D:\winmips64>asm.exe program\echo.s
Pass 1 completed with 0 errors
00000000          .data
00000000          str:        .asciiz "Hello World!"
         48656c6c
         6f20576f
         726c6421
         00
00000010 00010000 CONTROL:    .word32 0x10000
00000018 00010000 DATA:       .word32 0x10000
00000000          .text
00000000          main:
00000000 9c1f0010     lwu     r31,    CONTROL(r0)
00000004 9c1e0018     lwu     r30,    DATA(r0)
00000008 601d0004     daddi   r29,    r0,             4
0000000c 601c0000     daddi   r28,    r0,             str    ;
00000010 ffdc0000     sd      r28,    (r30)                       ; DATA <- address of string
00000014 fffd0000     sd      r29,    (r31)                       ; control mode <- 4
00000018 04000000     halt
                      ;ΦºúΘçè
                      ;Set CONTROL =
                      ; 1 ~ 5, will set DATA to specify output
                      ;1, to Unsigned Integer
                      ;2, to signed Integer
                      ;3, to floating point
                      ;4, to address of string
                      ;5, DATA + 5 to x σ¥Éµáç, DATA + 4 to y σ¥Éµáç, DATA to RGB Θó£Φë▓
                      ;6, clears the terminal screen
                      ;7, clears the graphics screen
                      ;8, read the DATA from the keyboard
                      ;9, read one byte from DATA, no character echo.


Pass 2 completed with 0 errors
Code Symbol Table
                main = 00000000
Data Symbol Table
                 str = 00000000
             CONTROL = 00000010
                DATA = 00000018
```
:::
![helloworld](/assets/image/lab1/helloworld.png)
## 任务2. bubble sort
- 对一组整型数组进行冒泡排序
- 要求实现swap函数
- 数据样例: `array: .word 8,6,3,7,1,0,9,4,5,2`
### 分析
需要对十个数进行排序，要求在sort函数中调用swap，使用栈的思想，在函数嵌套时保存$a的值。
> 注意: 需要将SP初始化为内存最高地址，否则初始化为0，使得SP-1将会指向0xffffffff，导致超出winmips默认的内存空间。 

::: info 最后终端的打印结果应该是:
![终端输出](/assets/image/lab1/sort.png)
:::
::: details 代码实现
:::code-tabs #shell
@tab bubble_sort.s
```asmatmel
.data   
array:      .word   8, 6, 3, 7, 1, 0, 9, 4, 5, 2
size:       .word   10
CONTROL:    .word32 0x10000
DATA:       .word32 0x10008
before:     .asciiz "before sort the array is:\n"
after:      .asciiz "after sort the array is:\n"

.text   
main:       
    daddi   r29,    r0,             0x03f8
    daddi   r1,     r0,             before
    lw      r2,     DATA(r0)
    sw      r1,     0(r2)
    daddi   r1,     r0,             4
    lw      r2,     CONTROL(r0)
    sw      r1,     0(r2)

    jal     show

    jal     sort

    daddi   r1,     r0,             after
    lw      r2,     DATA(r0)
    sw      r1,     0(r2)
    daddi   r1,     r0,             4
    lw      r2,     CONTROL(r0)
    sw      r1,     0(r2)

    jal     show

    halt    

show:       
    daddi   r29,    r29,            -16
    sw      r1,     12(r29)
    sw      r2,     8(r29)
    sw      r3,     4(r29)
    sw      r4,     0(r29)

    lw      r4,     size(r0)
    daddi   r1,     r0,             0
loop1:      
    dsll    r3,     r1,             3
    lw      r2,     array(r3)
    lw      r3,     DATA(r0)
    sw      r2,     0(r3)
    daddi   r2,     r0,             2
    lw      r3,     CONTROL(r0)
    sw      r2,     0(r3)
    daddi   r1,     r1,             1
    bne     r1,     r4,             loop1

    lw      r4,     0(r29)
    lw      r3,     4(r29)
    lw      r2,     8(r29)
    lw      r1,     12(r29)
    daddi   r29,    r29,            16
    jr      r31

swap:       
    daddi   r29,    r29,            -16
    sw      r8,     12(r29)
    sw      r9,     8(r29)
    sw      r10,    4(r29)
    sw      r31,    0(r29)

    dsll    r9,     r5,             3
    dadd    r9,     r4,             r9
    lw      r8,     0(r9)
    lw      r10,    8(r9)
    sw      r10,    0(r9)
    sw      r8,     8(r9)

    lw      r31,    0(r29)
    lw      r10,    4(r29)
    lw      r9,     8(r29)
    lw      r8,     12(r29)
    daddi   r29,    r29,            16
    jr      r31

sort:       
    daddi   r29,    r29,            -28
    sw      r31,    24(r29)
    sw      r1,     20(r29)
    sw      r2,     16(r29)
    sw      r3,     12(r29)
    sw      r8,     8(r29)
    sw      r9,     4(r29)
    sw      r10,    0(r29)

    lw      r10,    size(r0)
    daddi   r10,    r10,            -1
    daddi   r1,     r0,             0
loop2:      
    daddi   r2,     r0,             0
loop3:      
    dsll    r3,     r2,             3
    lw      r8,     array(r3)
    daddi   r3,     r3,             8
    lw      r9,     array(r3)
    slt     r3,     r8,             r9
    bnez    r3,     fine
    dadd    r5,     r2,             r0
    daddi   r4,     r0,             array
    jal     swap
fine:       
    daddi   r2,     r2,             1
    bne     r2,     r10,            loop3
    daddi   r1,     r1,             1
    bne     r1,     r10,            loop2

    lw      r10,    0(r29)
    lw      r9,     4(r29)
    lw      r8,     8(r29)
    lw      r3,     12(r29)
    lw      r2,     16(r29)
    lw      r1,     20(r29)
    lw      r31,    24(r29)
    daddi   r29,    r29,            28
    jr      r31
```
@tab 语法检查
```bash {2}
D:\winmips64>asm.exe program\bubble_sort.s
Pass 1 completed with 0 errors
00000000          .data
00000000 0000000000000008 array:      .word   8, 6, 3, 7, 1, 0, 9, 4, 5, 2
         0000000000000006
         0000000000000003
         0000000000000007
         0000000000000001
         0000000000000000
         0000000000000009
         0000000000000004
         0000000000000005
         0000000000000002
00000050 000000000000000a size:       .word   10
00000058 00010000 CONTROL:    .word32 0x10000
00000060 00010008 DATA:       .word32 0x10008
00000068          before:     .asciiz "before sort the array is:\n"
         6265666f
         72652073
         6f727420
         74686520
         61727261
         79206973
         3a0a00
00000088          after:      .asciiz "after sort the array is:\n"
         61667465
         7220736f
         72742074
         68652061
         72726179
         2069733a
         0a00

00000000          .text
00000000          main:
00000000 601d03f8     daddi   r29,    r0,             0x03f8
00000004 60010068     daddi   r1,     r0,             before
00000008 8c020060     lw      r2,     DATA(r0)
0000000c ac410000     sw      r1,     0(r2)
00000010 60010004     daddi   r1,     r0,             4
00000014 8c020058     lw      r2,     CONTROL(r0)
00000018 ac410000     sw      r1,     0(r2)

0000001c 0c000009     jal     show

00000020 0c00002f     jal     sort

00000024 60010088     daddi   r1,     r0,             after
00000028 8c020060     lw      r2,     DATA(r0)
0000002c ac410000     sw      r1,     0(r2)
00000030 60010004     daddi   r1,     r0,             4
00000034 8c020058     lw      r2,     CONTROL(r0)
00000038 ac410000     sw      r1,     0(r2)

0000003c 0c000001     jal     show

00000040 04000000     halt

00000044          show:
00000044 63bdfff0     daddi   r29,    r29,            -16
00000048 afa1000c     sw      r1,     12(r29)
0000004c afa20008     sw      r2,     8(r29)
00000050 afa30004     sw      r3,     4(r29)
00000054 afa40000     sw      r4,     0(r29)

00000058 8c040050     lw      r4,     size(r0)
0000005c 60010000     daddi   r1,     r0,             0
00000060          loop1:
00000060 002018f8     dsll    r3,     r1,             3
00000064 8c620000     lw      r2,     array(r3)
00000068 8c030060     lw      r3,     DATA(r0)
0000006c ac620000     sw      r2,     0(r3)
00000070 60020002     daddi   r2,     r0,             2
00000074 8c030058     lw      r3,     CONTROL(r0)
00000078 ac620000     sw      r2,     0(r3)
0000007c 60210001     daddi   r1,     r1,             1
00000080 1481fff7     bne     r1,     r4,             loop1

00000084 8fa40000     lw      r4,     0(r29)
00000088 8fa30004     lw      r3,     4(r29)
0000008c 8fa20008     lw      r2,     8(r29)
00000090 8fa1000c     lw      r1,     12(r29)
00000094 63bd0010     daddi   r29,    r29,            16
00000098 001f0008     jr      r31

0000009c          swap:
0000009c 63bdfff0     daddi   r29,    r29,            -16
000000a0 afa8000c     sw      r8,     12(r29)
000000a4 afa90008     sw      r9,     8(r29)
000000a8 afaa0004     sw      r10,    4(r29)
000000ac afbf0000     sw      r31,    0(r29)

000000b0 00a048f8     dsll    r9,     r5,             3
000000b4 0089482c     dadd    r9,     r4,             r9
000000b8 8d280000     lw      r8,     0(r9)
000000bc 8d2a0008     lw      r10,    8(r9)
000000c0 ad2a0000     sw      r10,    0(r9)
000000c4 ad280008     sw      r8,     8(r9)

000000c8 8fbf0000     lw      r31,    0(r29)
000000cc 8faa0004     lw      r10,    4(r29)
000000d0 8fa90008     lw      r9,     8(r29)
000000d4 8fa8000c     lw      r8,     12(r29)
000000d8 63bd0010     daddi   r29,    r29,            16
000000dc 001f0008     jr      r31

000000e0          sort:
000000e0 63bdffe4     daddi   r29,    r29,            -28
000000e4 afbf0018     sw      r31,    24(r29)
000000e8 afa10014     sw      r1,     20(r29)
000000ec afa20010     sw      r2,     16(r29)
000000f0 afa3000c     sw      r3,     12(r29)
000000f4 afa80008     sw      r8,     8(r29)
000000f8 afa90004     sw      r9,     4(r29)
000000fc afaa0000     sw      r10,    0(r29)

00000100 8c0a0050     lw      r10,    size(r0)
00000104 614affff     daddi   r10,    r10,            -1
00000108 60010000     daddi   r1,     r0,             0
0000010c          loop2:
0000010c 60020000     daddi   r2,     r0,             0
00000110          loop3:
00000110 004018f8     dsll    r3,     r2,             3
00000114 8c680000     lw      r8,     array(r3)
00000118 60630008     daddi   r3,     r3,             8
0000011c 8c690000     lw      r9,     array(r3)
00000120 0109182a     slt     r3,     r8,             r9
00000124 1c030003     bnez    r3,     fine
00000128 0040282c     dadd    r5,     r2,             r0
0000012c 60040000     daddi   r4,     r0,             array
00000130 0fffffda     jal     swap
00000134          fine:
00000134 60420001     daddi   r2,     r2,             1
00000138 1542fff5     bne     r2,     r10,            loop3
0000013c 60210001     daddi   r1,     r1,             1
00000140 1541fff2     bne     r1,     r10,            loop2

00000144 8faa0000     lw      r10,    0(r29)
00000148 8fa90004     lw      r9,     4(r29)
0000014c 8fa80008     lw      r8,     8(r29)
00000150 8fa3000c     lw      r3,     12(r29)
00000154 8fa20010     lw      r2,     16(r29)
00000158 8fa10014     lw      r1,     20(r29)
0000015c 8fbf0018     lw      r31,    24(r29)
00000160 63bd001c     daddi   r29,    r29,            28
00000164 001f0008     jr      r31


Pass 2 completed with 0 errors
Code Symbol Table
                main = 00000000
                show = 00000044
               loop1 = 00000060
                swap = 0000009c
                sort = 000000e0
               loop2 = 0000010c
               loop3 = 00000110
                fine = 00000134
Data Symbol Table
               array = 00000000
                size = 00000050
             CONTROL = 00000058
                DATA = 00000060
              before = 00000068
               after = 00000088
```
:::
