---
title: 6. riscv-mini运行观察
icon: eye
headerDepth: 3
description: riscv-mini运行观察，通过gtkwave观测波形图，验证指令执行的细节。
tag: [riscv-mini, chisel]
head: 
  - - meta
    - name: keywords
      content: riscv-mini运行观察, 通过波形图观测三级流水线的执行细节，验证流水线中的部分控制信号，对riscv-mini构建初步且直接的认识，有助于后续更加深入的学习riscv处理器。
---
## 目标
- riscv-mini架构和Chisel设计
- 观察指令执行

## 内容
1. 编写risc-v汇编，实现两数相减。
程序编译过程，程序仿真过程。

2. 给定C程序(阶乘计算)，完成编译仿真，通过波形图做出程序功能的解释。

## 配置步骤
开发环境的配置，主要涉及RISC-V工具链部分:  
[b站录屏](https://www.bilibili.com/video/BV1EC411a7fM)
```bash:no-line-numbers
git clone https://github.com/ucb-bar/riscv-mini.git 
cd riscv-mini 
make 
make verilator 
```

## 程序编译和运行

### 1. 编写汇编程序：  
**将立即数1和2写入到 x6和x7寄存器中, 两数相加，存入到x5寄存器中**
:::code-tabs #shell
@tab test.s
```asmatmel
    .text
    .global _start
_start:
    li x6, 1 
    li x7, 2 
    add x5, x6, x7 
exit:
    csrw mtohost, 1
    j exit
    .end
```
:::
::: info 在exit的循环: 将1写入到mtohost(一个csr寄存器)
**作用**: 通知仿真器结束仿真（类似于 X86汇编 中的 **HLT** 指令）。  
**前提**: 构建 **特权指令集1.7** 工具包, [下载参考](/trouble/riscv-toolchain.html#安装特权指令集1-7版本的gnu工具链)
:::

### 2. 编译test.s
```bash :no-line-numbers
riscv32-unknown-elf-gcc -nostdlib -Ttext=0x200 -o test test.s
# 编译完成之后，得到elf文件。
riscv32-unknown-elf-readelf -h test
# 查看系统架构， 入口地址
# 还可以反汇编
riscv32-unknown-elf-objdump -S test
```
:::details 输出内容
:::code-tabs #shell 
@tab readelf 
```bash 
> riscv32-unknown-elf-readelf -h test
ELF Header:
  Magic:   7f 45 4c 46 01 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF32
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           RISC-V
  Version:                           0x1
  Entry point address:               0x200
  Start of program headers:          52 (bytes into file)
  Start of section headers:          860 (bytes into file)
  Flags:                             0x0
  Size of this header:               52 (bytes)
  Size of program headers:           32 (bytes)
  Number of program headers:         1
  Size of section headers:           40 (bytes)
  Number of section headers:         5
  Section header string table index: 2
```
@tab 反汇编 
```bash
> riscv32-unknown-elf-objdump -S test

test:     file format elf32-littleriscv


Disassembly of section .text:

00000200 <_start>:
 200:   00100313                li      t1,1
 204:   00200393                li      t2,2
 208:   007302b3                add     t0,t1,t2

0000020c <exit>:
 20c:   7800d073                csrwi   mtohost,1
 210:   ffdff06f                j       20c <exit>
```
:::
> [!tip]
> 在 **riscv-mini** 上进行仿真，需要将 elf 转换为特定格式的 hex 文件。

- 工具：**elf2hex**
- 需求：转换为<u> 宽度为16字节的hex文件 </u> 。
- `Usage: elf2hex <width> <depth> <elf_file>`
```bash :no-line-numbers
elf2hex 16 4096 test > test.hex
./VTile ./test.hex test.vcd 

# 正常情况下：输出 
Enabling waves...
Starting simulation!
Simulation completed at time 56 (cycle 5)
Finishing simulation!
```

## C程序的编译和运行 
### 1. 编写factorial.c  
递归计算一个数的阶乘  
:::code-tabs #shell
@tab factorial.c 
```c
int factorial(int num);
void exit();
void main(){
	int ans = factorial(10);
	exit();
}
int factorial(int num){
	if(num <= 1) return 1;
	else return num * factorial(num - 1);
}
void exit(){
	while(1)
		__asm__ __volatile__("csrw mtohost, 1");
}
```
@tab 反汇编
```asmatmel
factorial.elf:     file format elf32-littleriscv


Disassembly of section .text:

00000200 <main>:
 200:   fe010113                addi    sp,sp,-32
 204:   00112e23                sw      ra,28(sp)
 208:   00812c23                sw      s0,24(sp)
 20c:   02010413                addi    s0,sp,32
 210:   00a00513                li      a0,10
 214:   00c000ef                jal     220 <factorial>
 218:   fea42623                sw      a0,-20(s0)
 21c:   064000ef                jal     280 <exit>

00000220 <factorial>:
 220:   fe010113                addi    sp,sp,-32
 224:   00112e23                sw      ra,28(sp)
 228:   00812c23                sw      s0,24(sp)
 22c:   02010413                addi    s0,sp,32
 230:   fea42623                sw      a0,-20(s0)
 234:   fec42703                lw      a4,-20(s0)
 238:   00100793                li      a5,1
 23c:   00e7c663                blt     a5,a4,248 <factorial+0x28>
 240:   00100793                li      a5,1
 244:   0280006f                j       26c <factorial+0x4c>
 248:   fec42783                lw      a5,-20(s0)
 24c:   fff78793                addi    a5,a5,-1
 250:   00078513                mv      a0,a5
 254:   fcdff0ef                jal     220 <factorial>
 258:   00050793                mv      a5,a0
 25c:   fec42583                lw      a1,-20(s0)
 260:   00078513                mv      a0,a5
 264:   030000ef                jal     294 <__mulsi3>
 268:   00050793                mv      a5,a0
 26c:   00078513                mv      a0,a5
 270:   01c12083                lw      ra,28(sp)
 274:   01812403                lw      s0,24(sp)
 278:   02010113                addi    sp,sp,32
 27c:   00008067                ret

00000280 <exit>:
 280:   ff010113                addi    sp,sp,-16
 284:   00812623                sw      s0,12(sp)
 288:   01010413                addi    s0,sp,16
 28c:   7800d073                csrwi   mtohost,1
 290:   ffdff06f                j       28c <exit+0xc>

00000294 <__mulsi3>:
 294:   00050613                mv      a2,a0
 298:   00000513                li      a0,0
 29c:   0015f693                andi    a3,a1,1
 2a0:   00068463                beqz    a3,2a8 <__mulsi3+0x14>
 2a4:   00c50533                add     a0,a0,a2
 2a8:   0015d593                srli    a1,a1,0x1
 2ac:   00161613                slli    a2,a2,0x1
 2b0:   fe0596e3                bnez    a1,29c <__mulsi3+0x8>
 2b4:   00008067                ret
```
:::

### 2. 编译
```bash 
riscv32-unknown-elf-gcc -nostdlib -Ttext=0x200 -march=RV32I -o factorial.elf factorial.c

> 会得到Warning, 不影响后续的实验步骤
```
:::info 参数解释
1. `-nostdlib`:  不链接标准库  
2. `-Ttext=0x200`:  指定text节的地址为0x200  
3. `-march=RV32I`: 由于riscv-mini的RV32I指令集没有乘法指令, 指定march之后，编译器会自动将乘法指令替换为以移位和加法运算完成的乘法运算
:::
```bash :no-line-numbers
elf2hex 16 4096 factorial.elf > factorial.hex 
./VTile ./factorial.hex factorial.vcd 

# 正常情况下打印：
Enabling waves...
Starting simulation!
Simulation completed at time 1376 (cycle 137)
Finishing simulation!
```

## 波形观察, 探索指令执行过程  
:::tip 波形观察
借助gtkwave工具，我们可以通过波形图，观察CPU中各个引脚或者寄存器数值的变化情况，跟踪指令在CPU中的执行过程。
:::
![数据通路-取指阶段](/assets/image/lab6/diagram-fetch.png =300x)
### 1. 取指阶段

素材： 由test.s 生成的vcd文件
```asmatmel:no-line-numbers{10}
riscv32-unknown-elf-objdump -S test

test:     file format elf32-littleriscv


Disassembly of section .text:

00000200 <_start>:
 200:   00100313                li      t1,1
 204:   00200393                li      t2,2
 208:   007302b3                add     t0,t1,t2

0000020c <exit>:
 20c:   7800d073                csrwi   mtohost,1
 210:   ffdff06f                j       20c <exit>
```
:::tip 前置知识 
riscv-mini采用三级流水线，
:::details 数据通路如图
![三级流水线-数据通路](/assets/image/lab6/diagram.png)
:::
- 取指：根据 PC值 取出将要执行的指令。  
1. 通过多路选择器Mux, 选择将要执行的下一条指令地址，
2. 随后获取对应地址中的指令，将读取到的指令放入到 **Fetch/Execute流水线寄存器** 中  
> 当流水线发生分支与异常等情况, 可能需要用空指令产生一个停顿。  

:::details 取指阶段对应的Chisel代码
- `next_pc` 多路选择器，根据控制信号选择下一条指令的地址。  

*详细过程描述：*  
1. 当流水线开始，PC寄存器 获取 `next_pc` 输出的地址
2. 从 `icache` 中读取对应地址的指令, 在没有气泡的情况下，读取到的PC和指令将分别保存到流水线寄存器 `fe_reg.pc` 与 `fe_reg.inst`。
```scala{6,18,27-28}
  /** **** Fetch *****/
  val started = RegNext(reset.asBool)
  val stall = !io.icache.resp.valid || !io.dcache.resp.valid
  val pc = RegInit(Const.PC_START.U(conf.xlen.W) - 4.U(conf.xlen.W))
  // Next Program Counter
  val next_pc = MuxCase(
    pc + 4.U,
    IndexedSeq(
      stall -> pc,
      csr.io.expt -> csr.io.evec,
      (io.ctrl.pc_sel === PC_EPC) -> csr.io.epc,
      ((io.ctrl.pc_sel === PC_ALU) || (brCond.io.taken)) -> (alu.io.sum >> 1.U << 1.U),
      (io.ctrl.pc_sel === PC_0) -> pc
    )
  )
  val inst =
    Mux(started || io.ctrl.inst_kill || brCond.io.taken || csr.io.expt, Instructions.NOP, io.icache.resp.bits.data)
  pc := next_pc
  io.icache.req.bits.addr := next_pc
  io.icache.req.bits.data := 0.U
  io.icache.req.bits.mask := 0.U
  io.icache.req.valid := !stall
  io.icache.abort := false.B

  // Pipelining
  when(!stall) {
    fe_reg.pc := pc
    fe_reg.inst := inst
  }
```
:::


#### 使用GTKWave打开vcd，验证引脚变量的数值
不妨以第二条指令为观察对象 (快照)- `li t2, 2`  
>  `li` 指令是一条伪指令，用于加载立即数。  **编译器会根据立即数的大小, 将其转化为一条或两条等价功能的指令来执行。**  
> 在这里`li t2,2`与`addi x7，x0，2`等价。


- 从波形图中观察验证：
1. `io_icache_req_addr` = `next_pc` 
> 若cache命中，直接在下一时钟周期取得对应指令  
> 如果不命中，产生停顿，直到从内存中读取完成

2. cache命中，根据 PC值 从 cache 读取得到指令`0x00200393(即li t2,2)`
> 且在下一个周期写入到流水线寄存器中 `fe_reg_inst`。

**该指令所在内存地址：<font color="red">0x204</font>**
:::details 波形图验证
![li t2,2 取指阶段](/assets/image/lab6/vcd-204.png)

- [x] `io_icache_req_addr` = `0x204` 
- [x] **valid位** 都为1 -> **icache** 命中 
- [x] `cache_data` = `0x00200393` 

![下一个周期](/assets/image/lab6/vcd-208.png)

- [x] 在下一个周期, 流水线寄存器 `fe_reg_inst`写入指令`0x00200393`。
:::

![数据通路-执行阶段](/assets/image/lab6/diagram-execute.png =300x)
### 2. 执行阶段

基本任务: 
1. 指令译码  
2. 准备操作数(从regfile中读取或产生立即数) 
3. 指令执行以及访存(访存指令)。  

处理过程: 
1. 指令译码, 通过立即数生成单元, 以及访问寄存器文件获得操作数，用来作为ALU的输入。
2. ALU具体的输入由多个 多路选择器 做出选择，
 > 可能来自寄存器、或立即数、或PC、或 forwaring (来自EXE/WB流水线寄存器中的数值)。  
3. 分支指令由BrCond模块进行判断，若需要分支，则下一条指令的PC地址为分支指令的目标地址。


:::details 对应的Chisel代码
1. 将指令传给控制单元, 以读取相应的控制信号
2. 将相应寄存器号传给寄存器文件, 以读取需要的操作数
3. 指令传给立即数生成单元, 以读取需要的立即数。
4. 对ALU的输入数据做出选择
5. 判断该指令是否产生分支
6. 对于lw和sw指令，使用计算出的地址访问数据cache进行访存操作。
7. 正常情况，产生的数据放入到EXE/WB流水线寄存器。
```scala{2,8-9,12-13,23-25,35-42,53-56}
/** **** Execute *****/
  io.ctrl.inst := fe_reg.inst

  // regFile read
  val rd_addr = fe_reg.inst(11, 7)
  val rs1_addr = fe_reg.inst(19, 15)
  val rs2_addr = fe_reg.inst(24, 20)
  regFile.io.raddr1 := rs1_addr
  regFile.io.raddr2 := rs2_addr

  // gen immdeates
  immGen.io.inst := fe_reg.inst
  immGen.io.sel := io.ctrl.imm_sel

  // bypass
  val wb_rd_addr = ew_reg.inst(11, 7)
  val rs1hazard = wb_en && rs1_addr.orR && (rs1_addr === wb_rd_addr)
  val rs2hazard = wb_en && rs2_addr.orR && (rs2_addr === wb_rd_addr)
  val rs1 = Mux(wb_sel === WB_ALU && rs1hazard, ew_reg.alu, regFile.io.rdata1)
  val rs2 = Mux(wb_sel === WB_ALU && rs2hazard, ew_reg.alu, regFile.io.rdata2)

  // ALU operations
  alu.io.A := Mux(io.ctrl.A_sel === A_RS1, rs1, fe_reg.pc)
  alu.io.B := Mux(io.ctrl.B_sel === B_RS2, rs2, immGen.io.out)
  alu.io.alu_op := io.ctrl.alu_op

  // Branch condition calc
  brCond.io.rs1 := rs1
  brCond.io.rs2 := rs2
  brCond.io.br_type := io.ctrl.br_type

  // D$ access
  val daddr = Mux(stall, ew_reg.alu, alu.io.sum) >> 2.U << 2.U
  val woffset = (alu.io.sum(1) << 4.U).asUInt | (alu.io.sum(0) << 3.U).asUInt
  io.dcache.req.valid := !stall && (io.ctrl.st_type.orR || io.ctrl.ld_type.orR)
  io.dcache.req.bits.addr := daddr
  io.dcache.req.bits.data := rs2 << woffset
  io.dcache.req.bits.mask := MuxLookup(
    Mux(stall, st_type, io.ctrl.st_type),
    "b0000".U,
    Seq(ST_SW -> "b1111".U, ST_SH -> ("b11".U << alu.io.sum(1, 0)), ST_SB -> ("b1".U << alu.io.sum(1, 0)))
  )

  // Pipelining
  when(reset.asBool || !stall && csr.io.expt) {
    st_type := 0.U
    ld_type := 0.U
    wb_en := false.B
    csr_cmd := 0.U
    illegal := false.B
    pc_check := false.B
  }.elsewhen(!stall && !csr.io.expt) {
    ew_reg.pc := fe_reg.pc
    ew_reg.inst := fe_reg.inst
    ew_reg.alu := alu.io.out
    ew_reg.csr_in := Mux(io.ctrl.imm_sel === IMM_Z, immGen.io.out, rs1)
    st_type := io.ctrl.st_type
    ld_type := io.ctrl.ld_type
    wb_sel := io.ctrl.wb_sel
    wb_en := io.ctrl.wb_en
    csr_cmd := io.ctrl.csr_cmd
    illegal := io.ctrl.illegal
    pc_check := io.ctrl.pc_sel === PC_ALU
  }
```
:::

仍然以第二条指令为观察对象 (快照)- `li t2, 2`  
> li是伪指令，等价于指令 `addi x7,x0,2`

- 操作数分别来自立即数x0寄存器，立即数生成单元。

- 在波形图中观察验证: 
1. 来自取指阶段的指令(fe_reg_inst)传递给立即数生成单元(immGen)、控制单元(ctrl)。
2. immGen给出立即数0x02，寄存器文件给出x0的数值。
3. ALU中以x0的值以及0x02作为输入，相加得到结果0x02 
4. 在下个时钟周期，流水线寄存器ew_reg_alu的值为ALU的结果0x02。  

**该指令所在内存地址：<font color="red">0x204</font>**
:::details 波形图
![指令li t2,2执行阶段](/assets/image/lab6/vcd-exe-1.png)
- [x] `fe_reg_inst = 0x00200393 `
- [x] `io_ctrl_inst = 0x00200393` 
- [x] `io_inst = 0x00200393 `, immGen的指令输入
- [x] `immgen_io_out =  2` , immGen的立即数输出
- [x] `io_out = 2` , ALU的输出

![下一时钟周期](/assets/image/lab6/vcd-exe-2.png)
- [x] `ew_reg_alu = 2`
:::


![数据通路-写回阶段](/assets/image/lab6/diagram-writeback.png =x300)
### 3. 写回阶段 

基本任务:  将在执行阶段产生的结果回写到寄存器中。  
> 根据指令类型, 选择对应的结果写入，  
> 对于LW指令，需要访问内存获取数据 dcache 
> 回写CSR寄存器 
> 回写寄存器文件  

:::details 对应的Chisel代码
处理过程:  
1. 从`dcache`读取数据
2. 根据指令类型提取需要的位。
3. 同时CSR的访问也在该阶段进行。
4. 根据控制信号，将需要的数据写回到寄存器文件当中。  
```scala{1,15,33,36-38} 
// Load
  val loffset = (ew_reg.alu(1) << 4.U).asUInt | (ew_reg.alu(0) << 3.U).asUInt
  val lshift = io.dcache.resp.bits.data >> loffset
  val load = MuxLookup(
    ld_type,
    io.dcache.resp.bits.data.zext,
    Seq(
      LD_LH -> lshift(15, 0).asSInt,
      LD_LB -> lshift(7, 0).asSInt,
      LD_LHU -> lshift(15, 0).zext,
      LD_LBU -> lshift(7, 0).zext
    )
  )

  // CSR access
  csr.io.stall := stall
  csr.io.in := ew_reg.csr_in
  csr.io.cmd := csr_cmd
  csr.io.inst := ew_reg.inst
  csr.io.pc := ew_reg.pc
  csr.io.addr := ew_reg.alu
  csr.io.illegal := illegal
  csr.io.pc_check := pc_check
  csr.io.ld_type := ld_type
  csr.io.st_type := st_type
  io.host <> csr.io.host

  // Regfile Write
  val regWrite =
    MuxLookup(
      wb_sel,
      ew_reg.alu.zext,
      Seq(WB_MEM -> load, WB_PC4 -> (ew_reg.pc + 4.U).zext, WB_CSR -> csr.io.out.zext)
    ).asUInt

  regFile.io.wen := wb_en && !stall && !csr.io.expt
  regFile.io.waddr := wb_rd_addr
  regFile.io.wdata := regWrite

  // Abort store when there's an excpetion
  io.dcache.abort := csr.io.expt

```
:::

对于`li t2, 2`（即`addi x7,x0,2`）指令，
在写回阶段将0x02写入到x7寄存器当中。  
- 从波形图中观察验证
1. 寄存器文件的写地址信号为07，且写信号有效位为1，  
2. 在下个时钟周期, 0x02将被成功写入到x7寄存器当中。  
:::details 波形图
![li t2, 2写回阶段](/assets/image/lab6/vcd-wb-1.png)
- [x] 寄存器文件的写地址信号为07，且写信号有效位为1，  

![下个时钟周期](/assets/image/lab6/vcd-wb-2.png)

- [x] 0x02将被成功写入到x7寄存器当中。  

:::

## 观察factorial的传参 
### 分析[factorial(10)](#_1-编写factorial-c) 的过程   
:::details 观察汇编代码
1. 首先addi指令偏移了栈指针，申请了32字节的栈空间，  
2. 两条sw指令将ra和s0的值保存在栈空间的指定位置，  
> 其中ra是用于保存函数返回地址的，s0则是存放需要保存的数据。  
> 将这两个寄存器值保存到堆栈即是在完成我们常说的在函数调用前保存现场的操作。  

3. 我们要观察的factorial（）函数第一次调用时参数10的传入是在哪条指令进行的？  
在 **`li a0,10 `** 
> 在跳转到factorial函数前将参数10传到a0（x10）寄存器中，  
> 按照RISC-V的规范约定，函数的参数传递可以使用寄存器a0~a7，这里factoria函数只有一个参数，  所以使用a0进行参数传递。
:::code-tabs #factorial 
@tab factorial
```asmatmel{2-4,6-7}
00000200 <main>:
 200:   fe010113                addi    sp,sp,-32
 204:   00112e23                sw      ra,28(sp)
 208:   00812c23                sw      s0,24(sp)
 20c:   02010413                addi    s0,sp,32
 210:   00a00513                li      a0,10
 214:   00c000ef                jal     220 <factorial>
 218:   fea42623                sw      a0,-20(s0)
 21c:   064000ef                jal     280 <exit>

00000220 <factorial>:
 220:   fe010113                addi    sp,sp,-32
 224:   00112e23                sw      ra,28(sp)
 228:   00812c23                sw      s0,24(sp)
 22c:   02010413                addi    s0,sp,32
 230:   fea42623                sw      a0,-20(s0)
 234:   fec42703                lw      a4,-20(s0)
 238:   00100793                li      a5,1
 23c:   00e7c663                blt     a5,a4,248 <factorial+0x28>
 240:   00100793                li      a5,1
 244:   0280006f                j       26c <factorial+0x4c>
 248:   fec42783                lw      a5,-20(s0)
 24c:   fff78793                addi    a5,a5,-1
 250:   00078513                mv      a0,a5
 254:   fcdff0ef                jal     220 <factorial>
 258:   00050793                mv      a5,a0
 25c:   fec42583                lw      a1,-20(s0)
 260:   00078513                mv      a0,a5
 264:   030000ef                jal     294 <__mulsi3>
 268:   00050793                mv      a5,a0
 26c:   00078513                mv      a0,a5
 270:   01c12083                lw      ra,28(sp)
 274:   01812403                lw      s0,24(sp)
 278:   02010113                addi    sp,sp,32
 27c:   00008067                ret

00000280 <exit>:
 280:   ff010113                addi    sp,sp,-16
 284:   00812623                sw      s0,12(sp)
 288:   01010413                addi    s0,sp,16
 28c:   7800d073                csrwi   mtohost,1
 290:   ffdff06f                j       28c <exit+0xc>

00000294 <__mulsi3>:
 294:   00050613                mv      a2,a0
 298:   00000513                li      a0,0
 29c:   0015f693                andi    a3,a1,1
 2a0:   00068463                beqz    a3,2a8 <__mulsi3+0x14>
 2a4:   00c50533                add     a0,a0,a2
 2a8:   0015d593                srli    a1,a1,0x1
 2ac:   00161613                slli    a2,a2,0x1
 2b0:   fe0596e3                bnez    a1,29c <__mulsi3+0x8>
 2b4:   00008067                ret
```
:::
  

### 观察指令缓存机制  
**从波形图中观察验证:**  
1. `icache的req.addr`端口与`next_pc`相等，  
> 当next_pc命中缓存，下个周期next_pc的值装入PC的同时，就能从icache中取出对应的指令。  
> 否则，next_pc的值装入PC之后，并不能立即读到指令  
> 当`cache缺失`，则需要访问内存，这个过程称为`refill`
2. `refill_buf_0` , 和 `refill_buf_1`是指令缓存的位置。 
3. 写缓存：停顿信号保持三个周期 (这期间注意cache模块的状态跳转)
> 状态变化 sReadCache x 1 clock -> sRefill x 2 clock
4. 缓存的不命中：
> 流水线停顿信号保持四个周期，访问内存，用于后续刷新缓存  
> 之后的一个时钟周期短暂恢复流水线，更新icache的请求地址  
> 重新停顿，同时fe_reg_inst更新，启动上条指令的执行阶段。  
> 在停顿期间进行写缓存, 刷新缓存
:::details 波形图验证
![写缓存观察](/assets/image/lab6/vcd-icache-buf.png)
- [x] 写缓存：停顿信号保持三个周期
  - [x] 状态变化 sReadCache x 1 -> sRefill x 2
  - [x] `refill_buf_0` , 和 `refill_buf_1`缓存后续的四条指令。 
- [x] 之后的一个时钟周期, icache输出next_pc对应的指令。流水线恢复正常

![缓存缺失-访问内存](/assets/image/lab6/vcd-icache-miss.png)
- [x] 发生`icache缺失`后： 停顿信号保持四个周期
  - [x] 停顿是为了进行内存的访问，用于后续的缓存刷新  
  - [x] 状态变化 sReadCache x1 -> sIdle x3, 
- [x] 之后的一个时钟周期暂时恢复流水线
  - [x] 更新icache_req.bits_addr为next_pc，
  - [x] icache_req.valid 为1 
  - [x] 此时refill_buf还没有变化

![缓存缺失-刷新缓存](/assets/image/lab6/vcd-icache-refresh.png)
- [x] 停顿信号继续生效三个周期,访存得到的数据将用于刷新缓存
  - [x] fe_reg_inst更新，启动上条指令的执行阶段
  - [x] icache的状态变化：sReadCache x 1 -> sRefill x 2，这是在写缓存的结果
  - [x] `refill_buf_0` , 和 `refill_buf_1`缓存后续的四条指令。  
- [x] 之后的一个时钟周期, icache输出next_pc对应的指令。流水线恢复正常
:::


### 观察控制信号的变化

控制单元经过指令译码之后得到的部分控制信号，  
1. `io_ctrl_a_sel`和`io_ctrl_b_sel`表示ALU的操作数来源，  
2. `io_ctrl_imm_sel`表示立即数的格式
3. `io_ctrl_alu_op`表示ALU需要进行的操作。  

:::details 上述信号的取值意义
建议查看[源码](https://github.com/ucb-bar/riscv-mini/blob/main/src/main/scala/mini/Control.scala)，此处罗列关键部分
:::code-tabs #def
@tab Control
```scala 
  // A_sel
  val A_XXX = 0.U(1.W)
  val A_PC = 0.U(1.W)
  val A_RS1 = 1.U(1.W)

  // B_sel
  val B_XXX = 0.U(1.W)
  val B_IMM = 0.U(1.W)
  val B_RS2 = 1.U(1.W)

  // imm_sel
  val IMM_X = 0.U(3.W)
  val IMM_I = 1.U(3.W)
  val IMM_S = 2.U(3.W)
  val IMM_U = 3.U(3.W)
  val IMM_J = 4.U(3.W)
  val IMM_B = 5.U(3.W)
  val IMM_Z = 6.U(3.W)
```
@tab ALU 
```scala 
object Alu {
  val ALU_ADD = 0.U(4.W)
  val ALU_SUB = 1.U(4.W)
  val ALU_AND = 2.U(4.W)
  val ALU_OR = 3.U(4.W)
  val ALU_XOR = 4.U(4.W)
  val ALU_SLT = 5.U(4.W)
  val ALU_SLL = 6.U(4.W)
  val ALU_SLTU = 7.U(4.W)
  val ALU_SRL = 8.U(4.W)
  val ALU_SRA = 9.U(4.W)
  val ALU_COPY_A = 10.U(4.W)
  val ALU_COPY_B = 11.U(4.W)
  val ALU_XXX = 15.U(4.W)
}
```
:::

**重点关注指令`li a0,10`, 地址`0x210`， 十六进制`0x00a00513`**                 
> 伪指令，对应 `add a0, x0, 10`
**从波形图中观察验证:**  
1. 在取得`0x00a00513`指令输入后，经过译码，这些控制信号的输出分别为：  

| 控制信号 | 输出 |
| --- | --- |
|`io_ctrl_a_sel`  | 1,对应 A_RS1 |
|`io_ctrl_b_sel` | 0,对应 B_IMM |
|`io_ctrl_imm_sel` | 001, 对应IMM_I |
| `io_ctrl_alu_op`  | 0000,对应ALU_ADD |


2. 观察寄存器文件和立即数生成单元
- [ ] addr1为0，addr2为0A，对应x0和x10寄存器的地址，
- [ ] 读出数据regFile_io_rdata1为0。  
- [ ] 立即数生成单元的输出10, 进行位扩展之后的结果为0000000A。  

3. 观察ALU单元
- [ ] ALU将选取rs1寄存器（这里对应x0）和立即数生成器的输出作为输入，  
  - [ ] alu_io_A和alu_io_B分别为0和0A，即regFile_io_rdata1和ImmGen_io_out的数值。  
  - [ ] alu_io_out则为alu执行ALU_ADD操作的结果，为0A。  
- [ ] alu计算结果在下一个周期出现在寄存器ew_reg_alu。  
- [ ] 在写回阶段，regFile_io_wen写允许位被拉高，写地址regFile_io_waddr为0A，即目的寄存器x10的地址，  

4. 验证寄存器最终结果
- [ ] 观察reg(10)即x10寄存器，可以看到其数值在下一个周期变为0A，证明写回阶段成功执行。

:::details 波形图验证
![译码后的信号](/assets/image/lab6/vcd-ctrl-1.png)
- [x] 译码后的控制信号的输出

![寄存器观察](/assets/image/lab6/vcd-ctrl-2.png)
- [x] addr1为0，addr2为0A
- [x] 数据regFile_io_rdata1为0。  
- [x] 立即数生成单元的输出进行位扩展之后的结果为0000000A。  

![ALU观察](/assets/image/lab6/vcd-ctrl-3.png)
- [x] ALU将选取rs1寄存器和立即数作为输入，  
  - [x] alu_io_A和alu_io_B分别为0和0A，即regFile_io_rdata1和ImmGen_io_out的数值。  
  - [x] alu_io_out则为ALU_ADD的执行结果，为0A。  

![写回阶段的观察](/assets/image/lab6/vcd-ctrl-3.png)
- [x] 写回阶段，alu计算结果出现在寄存器ew_reg_alu。  
- [x] 写回阶段，regFile_io_wen写使能有效，写地址regFile_io_waddr为0A


![验证最后的a0寄存器](/assets/image/lab6/vcd-ctrl-5.png)
- [x] x10寄存器，数值在下一个周期变为0A，写回阶段成功执行。
:::

