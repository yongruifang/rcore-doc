---
title: 2. MIPS模拟乘法器
icon: tag
headerDepth: 3
---
## 目标
1. 使用加法设计一个不检测溢出的乘法器
2. 设计一个可以检测溢出的乘法器

## 内容
### 以32位乘法为例，了解如何由加法得到乘法器
1. 判断：乘数 **最低位** 是否为<font color="red">1</font>  
   > 如果是，则 乘积 + 被乘数 ，将结果写入乘积寄存器；
2. 被乘数寄存器**左移1位**
3. 乘数寄存器**右移1位**
4. 判断：是否循环了32次
   > 是32次, 结束执行  
   > 否，返回步骤1继续执行

:::tip 关于溢出
对 32位 乘法的溢出检测，只需要对 64位 的寄存器的 **高32位** 进行检测。  
当 **高32位** 为0时，结果没有溢出。否则判定为溢出。
:::
## 代码设计
### 乘法器
:::code-tabs #shell 
@tab README
```md
Hello, 乘法器
```
@tab 忽略溢出
```asmatmel
.data   
CONTROL:    .word32 0x10000
DATA:       .word32 0x10008
cue1:       .asciiz "please enter two numbers:\n"
cue2:       .asciiz "results:\n"

.text   
    daddi   r1, r0,             cue1
    lw      r2, DATA(r0)
    sd      r1, 0(r2)
    daddi   r1, r0,             4
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    daddi   r1, r0,             8
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)
    lw      r2, DATA(r0)
    lw      r3, 0(r2)


    daddi   r1, r0,             8
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)
    lw      r2, DATA(r0)
    lw      r4, 0(r2)

    dadd    r5, r0,             r0
    daddi   r1, r0,             32
loop:       
    andi    r2, r4,             1
    beq     r2, r0,             zero
    dadd    r5, r5,             r3
zero:       
    dsll    r3, r3,             1
    dsra    r4, r4,             1
    daddi   r1, r1,             -1
    bne     r1, r0,             loop

    daddi   r1, r0,             cue2
    lw      r2, DATA(r0)
    sd      r1, 0(r2)
    daddi   r1, r0,             4
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    lw      r2, DATA(r0)
    sd      r5, 0(r2)
    daddi   r1, r0,             2
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    halt    
```
@tab 提示溢出
```asmatmel {6,54-65}
.data   
CONTROL:    .word32 0x10000
DATA:       .word32 0x10008
cue1:       .asciiz "please enter two numbers:\n"
cue2:       .asciiz "results:\n"
cue3:       .asciiz "warning: result overflow\n"

.text   
    daddi   r1, r0,             cue1
    lw      r2, DATA(r0)
    sd      r1, 0(r2)
    daddi   r1, r0,             4
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    daddi   r1, r0,             8
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)
    lw      r2, DATA(r0)
    lw      r3, 0(r2)


    daddi   r1, r0,             8
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)
    lw      r2, DATA(r0)
    lw      r4, 0(r2)

    dadd    r5, r0,             r0
    daddi   r1, r0,             32
loop:       
    andi    r2, r4,             1
    beq     r2, r0,             zero
    dadd    r5, r5,             r3
zero:       
    dsll    r3, r3,             1
    dsra    r4, r4,             1
    daddi   r1, r1,             -1
    bne     r1, r0,             loop

    daddi   r1, r0,             cue2
    lw      r2, DATA(r0)
    sd      r1, 0(r2)
    daddi   r1, r0,             4
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    lw      r2, DATA(r0)
    sd      r5, 0(r2)
    daddi   r1, r0,             2
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

    dsra    r1, r5,             16
    dsra    r1, r1,             16
    beq     r1, r0,             end

    daddi   r1, r0,             cue3
    lw      r2, DATA(r0)
    sd      r1, 0(r2)
    daddi   r1, r0,             4
    lw      r2, CONTROL(r0)
    sd      r1, 0(r2)

end:
    halt 
```
:::
:::details 查看diff
![multipler-diff](/assets/image/lab2/multipler-diff.png)
:::

