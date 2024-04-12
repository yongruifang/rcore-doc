---
title: 7. riscv-mini新增MDU模块
icon: circle-plus
headerDepth: 3
description: 基于riscv-mini, 新增MDU，并进行功能验证。
tag: [riscv-mini, chisel]
---
## 目标
- 在riscv-mini的基础上新增MDU模块
- 编写程序，验证功能。

## 内容
1. 修改数据通路，新增MDU模块  

2. 重新编译VTile, 测试指令，观察仿真波形，验证功能。

3. 扩展实验: 新增comb指令  

`comb rs1,rs2,rd` 
- 类型：R型，
- 功能： 将rs1高16位和rs2低16位拼接成32位，保存到rd

## 步骤
::: important 只演示如何添加有符号数乘法的功能。 
:::
### 1 新增模块MDU(Multiplication Division Unit) 
:::details mini/Mdu.scala
- [x] 定义操作码  
- [x] 当mdu_op为MDU_MUL时,进行乘法运算
:::code-tabs #shell
@tab Mdu 
```scala{7-8,28-35}
package mini

import chisel3._
import chisel3.util._

object Mdu {
  val MDU_XXX = 0.U(3.W)
  val MDU_MUL = 1.U(3.W)
}

class MduIO(width: Int) extends Bundle {
  val mdu_op = Input(UInt(3.W))
  val rs1 = Input(UInt(width.W))
  val rs2 = Input(UInt(width.W))
  val out = Output(UInt(width.W))

}

import mini.Mdu._

trait Mdu extends Module {
  def width: Int
  val io: MduIO
}

class MduSimple(val width: Int) extends Mdu {
  val io = IO(new MduIO(width))
  io.out := MuxLookup(
    io.mdu_op,
    0.U
  )(
    Seq(
      MDU_MUL -> (io.rs1.asSInt * io.rs2.asSInt).asUInt
    )
  )
}
```
:::

### 2 添加BitPat, 以及译码逻辑的补充 
新增乘法指令执行时的控制信号。  
:::details 
- [x] 新增MDU_OPT译码信号
- [x] 在映射中添加MUL指令对应的译码，
  - [x]  PC_4 
  - [x]  操作数为RS1和RS2 
  - [x]  不使用立即数以及ALU 
  - [x]  非分支指令 
  - [x]  不需要冲刷流水线 
  - [x]  不需要访存 
  - [x]  在写回阶段将ALU流水寄存器中的 数值写会到寄存器文件当红在哪个、
  - [x]  非CSR指令、
  - [x]  非异常指令、
  - [x]  MDU操作码为MDU_MUL 
- [x] 添加mdu_op的输出
:::code-tabs #shell 
@tab Instructions
```scala 
def MUL = BitPat("b0000001??????????000?????0110011")
```
@tab Control 
```scala{7,11,16,22}
++
import Mdu._ 
++

val default = List(PC_4  , A_XXX,  B_XXX, IMM_X, ALU_XXX   , BR_XXX, N, ST_XXX, LD_XXX, WB_ALU, N, CSR.N, Y,
+++
MDU_XXX)
+++

++
MUL  -> List(PC_4  , A_RS1,  B_RS2, IMM_X, ALU_XXX   , BR_XXX, N, ST_XXX, LD_XXX, WB_ALU, Y, CSR.N, N, MDU_MUL)
++

class ControlSignal extends Bundle {
+++
  val mdu_op = Output(UInt(3.W))
+++
}

class Control extends Module {
+++
  io.mdu_op := ctrlSignals(13)
+++
}
```
:::

### 3. config新增配置项
:::details 
:::code-tabs #config 
@tab Core 
```scala{4} 
case class CoreConfig(
  xlen:       Int,
  makeAlu:    Int => Alu = new AluSimple(_),
  makeMdu:    Int => Mdu = new MduSimple(_),
  makeBrCond: Int => BrCond = new BrCondSimple(_),
  makeImmGen: Int => ImmGen = new ImmGenWire(_))
```
@tab Config 
```scala{8}
object MiniConfig {
  def apply(): Config = {
    val xlen = 32
    Config(
      core = CoreConfig(
        xlen = xlen,
        makeAlu = new AluArea(_),
        makeMdu = new MduSimple(_),
        makeBrCond = new BrCondArea(_),
        makeImmGen = new ImmGenWire(_)
      ),
      cache = CacheConfig(
        nWays = 1,
        nSets = 256,
        blockBytes = 4 * (xlen / 8) // 4 * 32 bits = 16B
      ),
      nasti = NastiBundleParameters(
        addrBits = 32,
        dataBits = 64,
        idBits = 5
      )
    )
  }
}

```
:::

### 3. Datapath添加MDU模块以及相关的线路。 
:::details 
- [x] 新增Mdu实例化模块
- [x] Mdu输入信号的连接
- [x] 根据控制信号选择对于ALU流水线寄存器的写入数值，
    - [x] 当没有执行乘法指令时写入的是alu输出的数据，
    - [x] 当执行乘法指令写入的是mdu输出的数据。  
:::code-tabs #datapath 
@tab Datapath
```scala{2,5-7,13-14}

  val mdu = Module(conf.makeMdu(conf.xlen))

  // MDU operations
  mdu.io.rs1 := rs1
  mdu.io.rs2 := rs2
  mdu.io.mdu_op := io.ctrl.mdu_op

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
    // ew_reg.alu := alu.io.out
    ew_reg.alu := Mux(io.ctrl.mdu_op === Mdu.MDU_XXX, alu.io.out, mdu.io.out)
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

### 4 重新编译riscv-mini
```bash:no-line-numbers
make clean 
make 
make verilator

```

### 5. 测试
:::code-tabs #test
@tab mul.s
```asmatmel
.text 
.global _start

_start:
  li x5, 3 
  li x6, 11
  mul x7, x5, x6

exit:
  csrw mtohost, 1 
  j exit 

.end
```
@tab 编译
```bash:no-line-numbers
riscv-unknown-elf-gcc -nostdlib -Ttext=0x200 -o mul mul.s
riscv32-unknown-elf-gcc -nostdlib -Ttext=0x200 -o mul mul.s
elf2hex 16 2048 mul > mul.hex
./VTile mul.hex mul.vcd
gtkwave mul.vcd
```
@tab 反汇编
```bash
mul:     file format elf32-littleriscv


Disassembly of section .text:

00000200 <_start>:
 200:   00300293                li      t0,3
 204:   00b00313                li      t1,11
 208:   026283b3                mul     t2,t0,t1

0000020c <exit>:
 20c:   7800d073                csrwi   mtohost,1
 210:   ffdff06f                j       20c <exit>
```
:::

:::details 波形观察
- [x] mul t2,t0,t1 指令对应026283b3
- [x] Mdu模块的rs1,rs2输入符合预期
- [x] Mdu模块的输出符合预期
- [x] t2, 也就是x7寄存器最终写入33，乘法指令有效
![mul.vcd](/assets/image/lab7/vcd-mult.png)
:::



