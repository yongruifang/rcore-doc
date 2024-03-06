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
1. 测试乘数最低位是否为1，是则给乘积加上被乘数，将结果写入乘积寄存器；
2. 被乘数寄存器左移1位
3. 乘数寄存器右移1位
4. 判断是否循环了32次，是则结束，不是则返回1

### 关于溢出的提示
对32位乘法的溢出检测，只需要对64位的寄存器的高32位进行检测。
当高32位为0时，结果没有溢出。否则判定为溢出。

## 代码设计
### 乘法器-忽略溢出
```asmatmel
	.data
CONTROL: .word32 0x10000
DATA:	.word32 0x10008
cue1:	.asciiz "please enter two numbers:\n"
cue2:   .asciiz "results:\n"
	
	.text
	daddi r1,r0,cue1 	# please enter two numbers
	lw r2,DATA(r0)
	sd r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	daddi r1,r0,8	 	# r3=a
	lw r2,CONTROL(r0)
	sd r1,0(r2)
	lw r2,DATA(r0)
	lw r3,0(r2)
 
 
	daddi r1,r0,8 		# r4=b
	lw r2,CONTROL(r0)
	sd r1,0(r2)
	lw r2,DATA(r0)
	lw r4,0(r2)
 
	dadd r5,r0,r0		# r5=0 for r5=a*b
	daddi r1,r0,32
loop:	andi r2,r4,1		# r4[-1]
	beq r2,r0,zero		# r4[-1]==1?
	dadd r5,r5,r3
zero:	dsll r3,r3,1
	dsra r4,r4,1
	daddi r1,r1,-1
	bne r1,r0,loop
 
	daddi r1,r0,cue2	# results
	lw r2,DATA(r0)
	sd r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	lw r2,DATA(r0)		# output a*b
	sd r5,0(r2)
	daddi r1,r0,2
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	halt
```
### 乘法器-溢出提示
```asmatmel
	.data
CONTROL: .word32 0x10000
DATA:	.word32 0x10008
cue1:	.asciiz "please enter two numbers:\n"
cue2:   .asciiz "results:\n"
cue3:   .asciiz "warning: result overflow\n"
	
	.text
	daddi r1,r0,cue1 	# please enter two numbers
	lw r2,DATA(r0)
	sd r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	daddi r1,r0,8	 	# r3=a
	lw r2,CONTROL(r0)
	sd r1,0(r2)
	lw r2,DATA(r0)
	lw r3,0(r2)
 
 
	daddi r1,r0,8 		# r4=b
	lw r2,CONTROL(r0)
	sd r1,0(r2)
	lw r2,DATA(r0)
	lw r4,0(r2)
 
	dadd r5,r0,r0		# r5=0 for r5=a*b
	daddi r1,r0,32
loop:	andi r2,r4,1		# r4[-1]
	beq r2,r0,zero		# r4[-1]==1?
	dadd r5,r5,r3
zero:	dsll r3,r3,1
	dsra r4,r4,1
	daddi r1,r1,-1
	bne r1,r0,loop
 
	daddi r1,r0,cue2	# results
	lw r2,DATA(r0)
	sd r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	lw r2,DATA(r0)		# output a*b
	sd r5,0(r2)
	daddi r1,r0,2
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
	dsra r1,r5,16		# r1=r5[0:31]
	dsra r1,r1,16		
	beq r1,r0,end
	
	daddi r1,r0,cue3	# output overflow
	lw r2,DATA(r0)
	sd r1,0(r2)
	daddi r1,r0,4
	lw r2,CONTROL(r0)
	sd r1,0(r2)
 
end:	halt
```
