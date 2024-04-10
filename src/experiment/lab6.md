---
title: 6. riscv-mini运行观察
icon: eye
headerDepth: 3
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

需要完成: 
1. 指令译码  
2. 准备操作数(从regfile中读取或产生立即数) 
3. 指令执行以及访存(访存指令)。  
:::details 该阶段的数据通路
1. 根据需要执行的指令通过立即数生成单元以及访问寄存器文件获得执行阶段所需要使用的操作数作为ALU的输入。
2. 具体的输入由图中的多个多路选择器进行选择，可能为寄存器文件中读取到的数值、立即数、PC或者由处于下一个阶段的指令前递来的数值。  
3. 若为分支指令则由BrCond模块进行分支判断，若需要分支则下一条指令的PC地址为分支指令的目标地址。
:::


:::details 对应的Chisel代码
1. 将取指阶段得到的指令传给控制单元获得该指令的控制信号
2. 访问寄存器文件读取需要的操作数
3. 通过立即数生成单元获得立即数。
4. 对ALU的输入数据做出选择，来源可能为立即数、从寄存器文件中读取到的数据或者处于EXE/WB流水线寄存器中的数据（前递）
5. 同时判断该指令是否产生分支以及使用计算出的地址访问数据cache进行访存操作。
6. 若流水线正常执行则将该阶段产生的数据放入到EXE/WB流水线寄存器中供给下一个阶段使用，反之冲刷流水线产生气泡或者停顿流水线。
```scala 
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

不妨以第三条指令为观察对象 (快照)- `li t7, 2`  
> li是伪指令，等价于指令addi x7,x0,2

1. 产生立即数2，使用ALU将立即数与从x0寄存器读出的数值相加。

2. 在波形图中观察验证: 
- 立即数生成单元(immGen)、控制单元(ctrl)的输入均为取指阶段取出的指令fe_reg_inst。
- 立即数生成单元根据指令译码之后给出对应的立即数0x02，同时寄存器文件也给出了x0寄存器读取的结果(x0寄存器始终为0)。
- alu中以寄存器读取的结果以及立即数作为输入，根据控制信号将其相加得到结果0x02，并将结果写入到流水线寄存器ew_reg_alu中以供写回阶段使用。  
:::details 波形图
:::


![数据通路-写回阶段](/assets/image/lab6/diagram-writeback.png =x300)
### 3. 写回阶段 

1. 将指令执行的结果写回到寄存器中。  
- 根据指令类型将对应的结果写入到寄存器文件当中，  
- 若为访存指令则在该阶段获得防存的结果并提取需要的位将其写回。  
:::details 该阶段的数据通路
:::
2. 从数据Cache获得读取到的数据并根据指令类型提取需要的位。
3. 同时CSR的访问也在该阶段进行。
4. 据控制信号将需要的数据写回到寄存器文件当中。  


:::details 对应的Chisel代码
```scala 
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

对于li x7, 2（即addi x7,x0,2）指令，
需要将ALU计算出的结果0x02写入到x7寄存器当中。  
- 从波形图中观察验证
1. 在上一阶段执行完成得到0x02并将结果写入到流水线寄存器ew_reg_alu
2. 同时寄存器文件的写地址信号已经为07，且写信号为高，  
3. 在下一个时钟周期将会发现0x02已经被成功写入到x7寄存器当中。  
:::details 波形图
:::

## 解释函数传参过程 
解释上述C代码中factorial(10)函数的参数10传入寄存器的过程   
  
1. 从汇编程序看，程序开始时首先通过addi指令偏移了栈指针，申请了32字节的栈空间，  
2. 通过两条sw指令将寄存器ra和s0的值保存在栈的指定位置，  
> 其中寄存器ra是用于保存函数返回地址的，s0的作用则是存放需要保存的数据。  
3. 将这两个寄存器值保存到堆栈即是在完成我们常说的在函数调用前保存现场的操作。  

我们要观察的factorial（）函数第一次调用时参数10的传入是在哪条指令进行的？
> 在li a0,10 

- 在跳转到factorial函数前将参数10传到a0（x10）寄存器中，  
> 按照RISC-V的规范约定，函数的参数传递可以使用寄存器a0~a7，这里factoria函数只有一个参数，  所以使用a0进行参数传递。

**重点观察li a0,10指令，该指令对应的PC地址为0x210。**

- 从波形图中观察验证
1. icache的req.addr端口与next_pc相等，  
> 若cache命中的情况下，在下一个周期next_pc的值装入PC的同时，就能从icache中取出对应的指令。  
2. PC寄存器为0x210时，由于cache未命中，PC的值在后续三个周期保持不变直至成功取出指令00A00513。  
3. 指令在下一个时钟周期被传递到执行阶段的流水寄存器fe_inst，  
4. 同时传入立即数生成单元和控制单元作为输入，即immGen_io_inst和io_inst。  
5. 各执行单元对输入的指令进行解析，提取指定位段的数据，执行相应的操作。


- 其中Io_ctrl_A_sel，Io_ctrl_B_sel，Io_ctrl_imm_sel和Io_ctrl_alu_op为控制单元经过指令译码之后得到的部分控制信号，  
I
> o_ctrl_A_sel和Io_ctrl_B_sel信号表示输入alu的操作数来源，  
> Io_ctrl_imm_sel表示立即数格式，Io_ctrl_alu_op表示alu需要进行的操作。  

从波形图上观察验证，
- 在取得00A00513指令输入后，经过译码，这些控制信号的输出分别为：  



- 这些信号取值对应的详细意义  
可以到riscv-mini/src/main/scala/mini/control.scala查看源码。  

- regFile.io.raddr1和regFile.io.raddr2为从指令中提取出的源操作数1和源操作数2的寄存器地址，  

从波形图中观察验证: 
- addr1为0，addr2为0A，对应x0和x10寄存器的地址，之后传递给寄存器文件（Register File）的读取端口，  
- 读出数据regFile_io_rdata1和regFile_io_rdata2均为0。  

> ImmGen_io_out为立即数生成单元的输出，即对指令立即数字段提取之后进行扩展之后的结果0000000A。  
- 根据指令译码的结果，知道alu将选取rs1寄存器（这里对应x0）和立即数生成器的输出作为输入，  
从波形图上观察验证：
- alu_io_A和alu_io_B分别为0和0A，即regFile_io_rdata1和ImmGen_io_out的数值。  
- alu_io_out则为alu执行ALU_ADD操作的结果，为0A。  
- alu计算结果在下一个周期又送到了ew_reg_alu，供写回阶段使用。  
- 在写回阶段，regFile_io_wen写允许位被拉高，写地址regFile_io_waddr为0A，即目的寄存器x10的地址，  
- 写入数据regFile_io_wdata为0A，来自ew_reg_alu。  
- 观察reg(10)即x10寄存器，可以看到其数值在下一个周期变为0A，  
证明写回阶段成功执行。

