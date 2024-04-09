---
title: 4. MIPS流水线与冒险
icon: tag
headerDepth: 3
---
## 目标
1. 了解五级流水线
2. 了解不同的流水线冒险
3. 通过指令顺序调整 旁路 预测 来提高效率

## 内容
- 给定一段代码，运行，观察统计信息，找出冒险。
- 一边调整，一边观察反馈。  
- [x] enable forwarding: 开启

使用perf记录 时间统计  
调整指令，避免连续乘法之间的阻塞  
- 代码： 实现两个矩阵相加
:::code-tabs #shell 
@tab 伪代码
```c
for(int i = 0; i < 4; i ++) {
    for(int j = 0; j < 4; j ++) {
        C[i][j] = A[i][j] + B[i][j];
    }
}
```
:::
转换成MIPS的汇编。
:::details 汇编代码
:::code-tabs #shell
@tab matrix_add.s
```asmatmel
.data   
a:          .word   1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4
b:          .word   4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1
c:          .word   0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
LEN:        .word   4
CONTROL:    .word32 0x10000
DATA:       .word32 0x10008

.text   
start:      
    daddi   r17,    r0,         0
    daddi   r21,    r0,         a
    daddi   r22,    r0,         b
    daddi   r23,    r0,         c
    ld      r16,    LEN(r0)
loop1:      
    slt     r8,     r17,        r16
    beq     r8,     r0,         exit1
    daddi   r19,    r0,         0
loop2:      
    slt     r8,     r19,        r16
    beq     r8,     r0,         exit2
    dsll    r8,     r17,        2
    dadd    r8,     r8,         r19
    dsll    r8,     r8,         3
    dadd    r9,     r8,         r21
    dadd    r10,    r8,         r22
    dadd    r11,    r8,         r23
    ld      r9,     0(r0)
    ld      r10,    0(r10)
    dadd    r12,    r9,         r10
    sd      r12,    0(r11)
    daddi   r19,    r19,        1
    j       loop2
exit2:      
    daddi   r17,    r17,        1
    j       loop1
exit1:      
    halt
```
:::

### 内容规划

1. 给出一段代码，有意义的代码（比如矩阵加法），带有明显的数据相关，要求通过流水线执行来发现数据相关处，记录统计信息。
2. 对初始代码进行指令序列的调整，以获得性能提升，记录统计信息。
3. 启动forwarding功能以获得性能提升，记录统计信息。
4. 用循环中的连续乘法做功能冲突的展示，然后将后续无关指令填充到它们之间，实现优化。
5. 附加实验：用perf记录x86中的数据相关于指令序列调整前后的事件统计（stall等）

### 评分标准  

初始代码准备10分   
指令序列调整30分   
forwarding完成记录并解释正确，得20分  
指令调整后，结构相关得到解决，得30分  


## 矩阵相加

![未经优化-流水线停顿-220次](/assets/image/lab4/stall-1.png)


### 调整指令序列
:::code-tabs #shell 
@tab 1 
```asmatmel
ld r16, LEN(r0)
slt r8, r17, r16 
```

@tab 2 
```asmatmel
ld r9, 0(r0)
ld r10, 0(r10)
daddi r12, r9, r10 
sd r12, 0(r11)
daddi r19, r19, 1 
j loop2
```
:::

::: details 查看diff 

![diff1](/assets/image/lab4/multadd-diff1.png)

![diff2](/assets/image/lab4/multadd-diff2.png)

:::

![优化1-减少2次停顿](/assets/image/lab4/stall-2.png)


![优化2-减少16次停顿](/assets/image/lab4/stall-3.png)

### 启用forwarding

![启用forwarding-减少161次停顿](/assets/image/lab4/stall-4.png)
::: info 原理是什么
:::

## 结构相关-连续的除法指令
> 流水线的结构相关，是指流水线多条指令在同一时钟周期内争用同个功能部件的现象，是因为硬件资源满足不了指令重叠执行的要求而发生的冲突。

### 连续的除法
在winMIPS64中，我们可以在除法中观察到这种现象。  
::: details 代码
::: code-tabs #shell 
@tab 伪代码
```c
a = a / b;
c = c / d;
e = e + 1;
f = f + 1;
g = g + 1;
h = h + 1;
i = i + 1;
j = j + 1;
```
@tab MIPS 
```asmatmel
.data   
a:  .word   12
b:  .word   3
c:  .word   15
d:  .word   5
e:  .word   1
f:  .word   2
g:  .word   3
h:  .word   4
i:  .word   5
j:  .word   6

.text   
start:
    ld      r16,    a(r0)
    ld      r17,    b(r0)
    ld      r18,    c(r0)
    ld      r19,    d(r0)
    ld      r20,    e(r0)
    ld      r21,    f(r0)
    ld      r22,    g(r0)
    ld      r23,    h(r0)
    ld      r24,    i(r0)
    ld      r25,    j(r0)
    ddiv    r16,    r16,    r16
    ddiv    r18,    r18,    r19
    daddi   r20,    r20,    1
    daddi   r21,    r21,    1
    daddi   r22,    r22,    1
    daddi   r23,    r23,    1
    daddi   r24,    r24,    1
    daddi   r25,    r25,    1
    sd      r16,    a(r0)
    sd      r17,    b(r0)
    sd      r18,    c(r0)
    sd      r19,    d(r0)
    sd      r20,    e(r0)
    sd      r21,    f(r0)
    sd      r22,    g(r0)
    sd      r23,    h(r0)
    sd      r24,    i(r0)
    sd      r25,    j(r0)
    halt    

```
:::

两个连续的除法发生了明显的结构相关。  
第二个除法为了等待上一个除法指令，阻塞了9个周期。  

![事件统计](/assets/image/lab4/divide-stall-1.png)

### 调整序列
::: tip 调整指令序列
将其他无关的指令塞入两条连续的除法指令之间。
:::

:::details 完整代码
:::code-tabs #shell 
@tab 伪代码
```c
a = a / b;
e = e + 1;
f = f + 1;
g = g + 1;
h = h + 1;
i = i + 1;
j = j + 1;
c = c / d;
```
@tab divide-2.s
```asmatmel
.data   
a:  .word   12
b:  .word   3
c:  .word   15
d:  .word   5
e:  .word   1
f:  .word   2
g:  .word   3
h:  .word   4
i:  .word   5
j:  .word   6

.text   
start:
    ld      r16,    a(r0)
    ld      r17,    b(r0)
    ddiv    r16,    r16,    r17
    ld      r18,    c(r0)
    ld      r19,    d(r0)
    ld      r20,    e(r0)
    ld      r21,    f(r0)
    ld      r22,    g(r0)
    ld      r23,    h(r0)
    ld      r24,    i(r0)
    ld      r25,    j(r0)
    daddi   r20,    r20,    1
    daddi   r21,    r21,    1
    daddi   r22,    r22,    1
    daddi   r23,    r23,    1
    daddi   r24,    r24,    1
    daddi   r25,    r25,    1
    sd      r20,    e(r0)
    sd      r21,    f(r0)
    sd      r22,    g(r0)
    sd      r23,    h(r0)
    sd      r24,    i(r0)
    sd      r25,    j(r0)
    ddiv    r18,    r18,    r19
    halt    
```
:::
:::details 查看diff 
![diff](/assets/image/lab4/divide-diff.png)
:::
![事件统计](/assets/image/lab4/divide-stall-2.png)
