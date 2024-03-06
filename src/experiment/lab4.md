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
- 边调整，边看反馈。
- [x] enable forwarding: 开启
使用perf记录 时间统计
调整指令，避免连续乘法之间的阻塞
- 代码： 实现两个矩阵相加
```c
for(int i = 0; i < 4; i ++) {
    for(int j = 0; j < 4; j ++) {
        C[i][j] = A[i][j] + B[i][j];
    }
}
```
转换成MIPS的汇编。
```asmatmel
.data
a:  .word   1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4
b:  .word   4,4,4,4,3,3,3,3,2,2,2,2,1,1,1,1
c:  .word   0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
LEN:        .word   4
CONTROL:    .word32   0x10000
DATA:       .word32   0x10008

.text
start:
daddi   r17, r0, 0
daddi   r21, r0, a 
daddi   r22, r0, b
daddi   r23, r0, c
ld  r16, len(r0)
loop1:
slt r8, r17, r16
beq r8, r0, exit1
daddi   r19, r0, 0
loop2:
slt r8, r19, r16
beq r8, r0, exit2
dsll    r8, r17, 2
dadd    r8, r8, r19
dsll    r8, r8, 3
dadd r9, r8, r21
dadd r10, r8, r22
dadd r11, r8, r23
ld r9, 0(r0)
ld r10, 0(r10)
dadd    r12, r9, r10
sd  r12, 0(r11)
daddi   r19, r19, 1
j   loop2
exit2:
daddi   r17, r17, 1
j   loop1
exit1:
halt

```

