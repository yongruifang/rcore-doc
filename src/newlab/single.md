---
title: 实现一个简单的单周期CPU
shortTitle: 1. 单周期实现
icon: circle-dot
headerDepth: 3
description: 基于Chisel实现一个单周期CPU, 从取指开始，用loadMemoryFromFile初始化内存，通过逐步实现各种类型的指令来体验制作一个简易CPU的过程，最终通过riscv-tests对我们实现的指令集进行测试。
tag: [riscv, chisel]
---

## 实验目的
基于Chisel实现一个单周期CPU, 能识别处理RISC-V基本整数指令集 
1. 使用hex文件初始化内存，测试驱动开发  
2. 逐步实现RISC-V的基本整数指令集, 初步体验制作一个简易CPU的过程。
3. 进一步实现管理控制和状态寄存器的CSR扩展指令Zicsr
3. 通过riscv-tests对我们实现的基本整数指令集进行测试。

## 项目初始化
:::details 初始化
:::code-tabs #shell 
@tab .scalafmt.conf 
```conf 
version = "3.7.15"
runner.dialect = scala213
align.preset = more
```
@tab build.sbt 
```sbt 
// See README.md for license details.

ThisBuild / scalaVersion := "2.13.12"
ThisBuild / version := "0.1.0"
ThisBuild / organization := "%ORGANIZATION%"

val chiselVersion = "5.1.0"

lazy val root = (project in file("."))
  .settings(
    name := "%NAME%",
    libraryDependencies ++= Seq(
      "org.chipsalliance" %% "chisel" % chiselVersion,
      "edu.berkeley.cs" %% "chiseltest" % "5.0.2" % "test"
    ),
    scalacOptions ++= Seq(
      "-language:reflectiveCalls",
      "-deprecation",
      "-feature",
      "-Xcheckinit",
      "-Ymacro-annotations"
    ),
    addCompilerPlugin(
      "org.chipsalliance" % "chisel-plugin" % chiselVersion cross CrossVersion.full
    )
  )


```
:::

## 取指
1. 搭建基础设施和基本接口，实现取指需要的最低配置。
::: details 代码
Instructions用BitPat对象定义了各指令的位列。  
::: code-tabs #shell 
@tab Instructions
```scala 
package common

import chisel3.util.BitPat

object Instructions {
  // Loads
  def LB = BitPat("b?????????????????000?????0000011")
  def LH = BitPat("b?????????????????001?????0000011")
  def LW = BitPat("b?????????????????010?????0000011")
  def LBU = BitPat("b?????????????????100?????0000011")
  def LHU = BitPat("b?????????????????101?????0000011")
  // Stores
  def SB = BitPat("b?????????????????000?????0100011")
  def SH = BitPat("b?????????????????001?????0100011")
  def SW = BitPat("b?????????????????010?????0100011")
  // Shifts
  def SLL = BitPat("b0000000??????????001?????0110011")
  def SLLI = BitPat("b0000000??????????001?????0010011")
  def SRL = BitPat("b0000000??????????101?????0110011")
  def SRLI = BitPat("b0000000??????????101?????0010011")
  def SRA = BitPat("b0100000??????????101?????0110011")
  def SRAI = BitPat("b0100000??????????101?????0010011")
  // Arithmetic
  def ADD = BitPat("b0000000??????????000?????0110011")
  def ADDI = BitPat("b?????????????????000?????0010011")
  def SUB = BitPat("b0100000??????????000?????0110011")
  def LUI = BitPat("b?????????????????????????0110111")
  def AUIPC = BitPat("b?????????????????????????0010111")
  // Logical
  def XOR = BitPat("b0000000??????????100?????0110011")
  def XORI = BitPat("b?????????????????100?????0010011")
  def OR = BitPat("b0000000??????????110?????0110011")
  def ORI = BitPat("b?????????????????110?????0010011")
  def AND = BitPat("b0000000??????????111?????0110011")
  def ANDI = BitPat("b?????????????????111?????0010011")
  // Compare
  def SLT = BitPat("b0000000??????????010?????0110011")
  def SLTI = BitPat("b?????????????????010?????0010011")
  def SLTU = BitPat("b0000000??????????011?????0110011")
  def SLTIU = BitPat("b?????????????????011?????0010011")
  // Branches
  def BEQ = BitPat("b?????????????????000?????1100011")
  def BNE = BitPat("b?????????????????001?????1100011")
  def BLT = BitPat("b?????????????????100?????1100011")
  def BGE = BitPat("b?????????????????101?????1100011")
  def BLTU = BitPat("b?????????????????110?????1100011")
  def BGEU = BitPat("b?????????????????111?????1100011")
  // Jump & Link
  def JAL = BitPat("b?????????????????????????1101111")
  def JALR = BitPat("b?????????????????000?????1100111")
  // Synch
  def FENCE = BitPat("b0000????????00000000000000001111")
  def FENCEI = BitPat("b00000000000000000001000000001111")
  // CSR Access
  def CSRRW = BitPat("b?????????????????001?????1110011")
  def CSRRS = BitPat("b?????????????????010?????1110011")
  def CSRRC = BitPat("b?????????????????011?????1110011")
  def CSRRWI = BitPat("b?????????????????101?????1110011")
  def CSRRSI = BitPat("b?????????????????110?????1110011")
  def CSRRCI = BitPat("b?????????????????111?????1110011")
  // Change Level
  def ECALL = BitPat("b00000000000000000000000001110011")
  def EBREAK = BitPat("b00000000000100000000000001110011")
  def ERET = BitPat("b00010000000000000000000001110011")
  def WFI = BitPat("b00010000001000000000000001110011")

  def NOP = BitPat.bitPatToUInt(BitPat("b00000000000000000000000000010011"))
}
```
@tab common/Constant
```scala 
package common
import chisel3._
object Constants {
  val WORD_LEN = 32
  val START_ADDR = 0.U
}
```
@tab single/Core 
```scala 
package single

import chisel3._
import chisel3.util._
import common.Constants._

class Core extends Module{
  val io = IO(new Bundle{
    val imem = Flipped(new IMemPortIO())
    val exit = Output(Bool())
  })
  /* 基础设施 */
  val regfile = Mem(32, UInt(WORD_LEN.W))
  val pc_reg = RegInit(START_ADDR)
  /* 取指 */
  pc_reg := pc_reg + 4.U(WORD_LEN.W)
  io.imem.addr := pc_reg
  val inst = io.imem.inst
  /* exit信号*/
  io.exit := (inst === 0x00000000.U(WORD_LEN.W))
  /* 调试打印 */
  printf(p"pc_reg: 0x${Hexadecimal(pc_reg)}\n")
  printf(p"inst: 0x${Hexadecimal(inst)}\n")
  printf("-----------\n")
}
```

@tab single/Memory
```scala 
package single

import chisel3._
import chisel3.util._
import chisel3.util.experimental.loadMemoryFromFileInline

import common.Constants._

// 定义取指令的IO接口
class IMemPortIO extends Bundle {
  val addr = Input(UInt(WORD_LEN.W))
  val inst = Output(UInt(WORD_LEN.W))
}
class Memory(memoryFile: String="") extends Module {
  val io = IO(new Bundle {
    val imem = new IMemPortIO()
  })
  /*基础设施*/
  val mem = Mem(16384, UInt(8.W))
  /*加载内存*/
  loadMemoryFromFileInline(mem, memoryFile)
  /*取指*/
  io.imem.inst := Cat (
    mem(io.imem.addr + 3.U(WORD_LEN.W)),
    mem(io.imem.addr + 2.U(WORD_LEN.W)),
    mem(io.imem.addr + 1.U(WORD_LEN.W)),
    mem(io.imem.addr)
  )
}
```
@tab single/Top
```scala 
package single

import chisel3._
import chisel3.util._

class Top(memoryFile: String = "") extends Module {
   val io = IO(new Bundle {
    val exit = Output(Bool())
  })
  val core = Module(new Core())
  val memory = Module(new Memory(memoryFile))
  // 连线
  core.io.imem <> memory.io.imem
  io.exit := core.io.exit
}
object Top extends App {
  println(emitVerilog(new Top, args));
}
```
:::

- hex文件初始化内存，并进行测试
:::details 代码
:::code-tabs #shell 
@tab README 
```md 
# single.hex.txt 指令文件说明
文件采用大端序，将存储器中的数位从大到小的顺序排列
为了理解，以32位为单位重新整理，并附上相应的汇编指令

03 
23 
80 
00
lw x6, 8(x0):
0x00802303 
---
b3
02
63
00
add x5, x6, x6
0x006302b3
---
b3
87
62
40
sub x15, x5, x6
0x406287b3
---
exit
0x00000000
---

```
@tab src/hex/example.hex.txt 
```txt 
03
23 
80 
00
b3 
02 
63 
00
b3 
87 
62  
40
00 
00 
00 
00
```
@tab Memory.scala 
```scala 
loadMemoryFromFileInline(mem, memoryfile)
```

@tab BasicSpec.scala 
```scala 
package single 
import chisel3._
import chiseltest._
import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class BasicSpec extends AnyFreeSpec with ChiselScalatestTester {
   "fetch instr" in {
      test(new Top("src/hex/example.hex.txt")).withAnnotations(Seq(WriteVcdAnnotation)) {dut => 
        while(!dut.io.exit.peek().litToBoolean){
          dut.clock.step()
        }
      }
   }
} 
```
:::


## 渐进式开发
从译码开始，通过逐步扩展指令的实现来进行代码完善
:::details 代码 
:::code-tabs #shell 
@tab Core 
```scala 
  /* 译码 */
  val rs1_addr = inst(19, 15)
  val rs2_addr = inst(24, 20)
  val wb_addr = inst(11, 7)
  val rs1_data = Mux((rs1_addr=/=0.U(WORD_LEN.W)), 
    regfile(rs1_addr), 0.U(WORD_LEN.W))
  val rs2_data = Mux((rs2_addr=/=0.U(WORD_LEN.W)),
    regfile(rs2_addr), 0.U(WORD_LEN.W))

  /* 调试信息 */
+++
  printf(p"rs1_addr: ${rs1_addr}\n")
  printf(p"rs1_data: 0x${Hexadecimal(rs1_data)}\n")
  printf(p"rs2_addr: ${rs2_addr}\n")
  printf(p"rs2_data: 0x${Hexadecimal(rs2_data)}\n")
+++
```
@tab 运行测试
```bash 
sbt "testOnly single.BasicSpec" 

打印调试信息内容：
-----------  对应 lw x6, 8(x0):
pc_reg: 0x00000000
inst: 0x00802303
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
----------- 对应 add x5, x6, x6 
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x00000000
----------- 对应 sub x15, x5, x6
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x00000000
```
:::

### LW指令的实现
LW, load word, 从存储器读取32位数据到寄存器。   
:::details 代码
汇编描述：`lw rd, offset(rs1)`  
运算：`x[rd] = M[x[rs1] + sext(imm_i)]`  
> sext表示符号扩展  

位配置: I格式   
I格式的立即数，记录为`imm_i`  
:::code-tabs #shell 
@tab Core 
```scala 
+++
import common.Instructions._
+++
+++
    val dmem = Flipped(new DMemPortIO())
+++


  val imm_i = inst(31, 20)
  val imm_i_sext = Cat(Fill(20, imm_i(11)), imm_i)
  /*================ EX阶段 ==================*/
  val alu_out = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (inst === LW) -> (rs1_data + imm_i_sext)
    )
  )
  /*================ MEM阶段 =================*/
  io.dmem.addr := alu_out
  /*================ WB阶段 ==================*/
  val wb_data = io.dmem.read_data
  when(inst === LW) {
    regfile(wb_addr) := wb_data
  }


  /*========调试打印===========*/
+++
  printf(p"wb_addr, 0x${Hexadecimal(wb_addr)}\n")
  printf(p"alu_out: 0x${Hexadecimal(alu_out)}\n")
  printf(p"wb_data: 0x${Hexadecimal(wb_data)}\n")
+++
```

@tab Memory 
```scala 
class DMemPortIO extends Bundle {
  val addr = Input(UInt(WORD_LEN.W))
  val read_data = Output(UInt(WORD_LEN.W))
}
class Memory(memoryFile: String="") extends Module {
  val io = IO(new Bundle {
    val imem = new IMemPortIO()
+++
    val dmem = new DMemPortIO()
+++
  })
  /*基础设施*/
  val mem = Mem(16384, UInt(8.W))

@@ -24,7 +29,14 @@ class Memory(memoryFile: String="") extends Module {
  io.imem.inst := Cat (
    mem(io.imem.addr + 3.U(WORD_LEN.W)),
    mem(io.imem.addr + 2.U(WORD_LEN.W)),
+++
    mem(io.imem.addr + 1.U(WORD_LEN.W)), mem(io.imem.addr)
  )
  /*LW*/
  io.dmem.read_data := Cat (
    mem(io.dmem.addr + 3.U(WORD_LEN.W)),
    mem(io.dmem.addr + 2.U(WORD_LEN.W)),
    mem(io.dmem.addr + 1.U(WORD_LEN.W)),
    mem(io.dmem.addr)

  )
+++
}
```

@tab Top 
```scala 
+++
  core.io.dmem <> memory.io.dmem 
```

@tab 运行测试
```bash{11-13,25-26} 
sbt "testOnly single.BasicSpec"

打印调试信息:
----------- 对应指令: lw x6, 8(x0)
pc_reg: 0x00000000
inst: 0x00802303
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
wb_addr, 0x06
alu_out: 0x00000008
wb_data: 0x406287b3
----------- 对应指令： add x5, x6, x6
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x406287b3
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x00000000
wb_data: 0x00802303
----------- 对应指令：sub x15, x5, x6
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x0f
alu_out: 0x00000000
wb_data: 0x00802303
```
:::


### SW指令的实现 
SW, store word, 将32位的寄存器数据写入寄存器中
:::details 代码
汇编描述：`sw rs2, offset(rs1)`  
运算：`M[ x[rs1]+sext(imm_s) ] = x[rs2]`  
位配置：S格式   
S格式的立即数记录为`imm_s`  

> 许多指令中出现的s2和rd的位址不变，这个现象使得译码更加容易，灵活适应部分立即数

:::code-tabs #shell 
@tab README 
```md 
+++
23
28
60
00
sw x6, 16(x0)
0x00602823
+++
```
@tab example.hex.txt 
```txt 
+++
23
28
60
00
+++
```
@tab Memory 
```scala 
+++
  val write_enable = Input(Bool())
  val write_data = Input(UInt(WORD_LEN.W))
+++
class Memory(memoryFile: String="") extends Module {
  val io = IO(new Bundle {

@@ -37,6 +39,11 @@ class Memory(memoryFile: String="") extends Module {
    mem(io.dmem.addr + 2.U(WORD_LEN.W)),
    mem(io.dmem.addr + 1.U(WORD_LEN.W)),
    mem(io.dmem.addr)

  )
+++
  when(io.dmem.write_enable) {
    mem(io.dmem.addr) := io.dmem.write_data(7, 0) 
    mem(io.dmem.addr + 1.U) := io.dmem.write_data(15, 8) 
    mem(io.dmem.addr + 2.U) := io.dmem.write_data(23, 16)
    mem(io.dmem.addr + 3.U) := io.dmem.write_data(31, 24) 
  }
+++
```
@tab Core 
```scala 
+++ 1
  val imm_i_sext = Cat(Fill(20, imm_i(11)), imm_i)
  val imm_s = Cat(inst(31,25), inst(11,7))
  val imm_s_sext = Cat(Fill(20, imm_s(11)), imm_s)
+++
  
  /*================ EX阶段 ==================*/
  val alu_out = MuxCase(0.U(WORD_LEN.W), Seq(
    (inst === LW) -> (rs1_data + imm_i_sext),
+++ 2
    (inst === SW) -> (rs1_data + imm_s_sext)
+++
  ))
  /*================ MEM阶段 =================*/
  io.dmem.addr := alu_out
+++ 3
  io.dmem.write_enable := (inst === SW)
  io.dmem.write_data := rs2_data
+++ 
  /*================ WB阶段 ==================*/
  val wb_data = io.dmem.read_data
  when(inst === LW) {

@@ -52,5 +58,7 @@ class Core extends Module{
  printf(p"wb_addr, 0x${Hexadecimal(wb_addr)}\n")
  printf(p"alu_out: 0x${Hexadecimal(alu_out)}\n")
  printf(p"wb_data: 0x${Hexadecimal(wb_data)}\n")
+++ 4
  printf(p"dmem.wen: 0x${Hexadecimal(io.dmem.write_enable)}\n")
  printf(p"dmem.wdata: 0x${Hexadecimal(io.dmem.write_data)}\n")
+++
  printf("-----------\n")
```
@tab 运行测试
```bash{8,10}
----------- 对应指令 sw x6, 16(x0)
pc_reg: 0x0000000c
inst: 0x00602823
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x10
alu_out: 0x00000006
wb_data: 0x87b30063
dmem.wen: 0x1
dmem.wdata: 0x406287b3
```
:::

### 加减法指令的实现
最基本的运算--加减法
:::details 代码
除了加载/存储指令, 其他指令没有访存需求。
:::code-tabs #shell 
@tab core 
```scala 
  val alu_out = MuxCase(0.U(WORD_LEN.W), Seq(
      (inst === LW) -> (rs1_data + imm_i_sext),
      (inst === SW) -> (rs1_data + imm_s_sext),
      (inst === ADD) -> (rs1_data + rs2_data),
      (inst === SUB) -> (rs1_data - rs2_data)
  ))

  val wb_data = MuxCase(
    alu_out,
    Seq(
      (inst === LW) -> io.dmem.read_data
    )
  )
  when(inst === LW || inst === ADD || inst === ADDI || inst === SUB) {
    regfile(wb_addr) := wb_data
  }
```
@tab 运行测试
```bash{4,6,8-10,16,18,20-22}
----------- 对应指令 add x5, x6, x6 
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x406287b3
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x406287b3
----------- 对应指令 sub x15, x5, x6 
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x0f
alu_out: 0x406287b3
wb_data: 0x406287b3
dmem.wen: 0x0
dmem.wdata: 0x406287b3
```
:::

### 逻辑运算的实现
:::details 
:::code-tabs #logic 
@tab Core 
```scala
  val alu_out = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (inst === LW) -> (rs1_data + imm_i_sext),
      (inst === SW) -> (rs1_data + imm_s_sext),
      (inst === ADD) -> (rs1_data + rs2_data),
      (inst === SUB) -> (rs1_data - rs2_data),
      (inst === AND) -> (rs1_data & rs2_data),
      (inst === OR) -> (rs1_data | rs2_data),
      (inst === XOR) -> (rs1_data ^ rs2_data),
      (inst === ANDI) -> (rs1_data & imm_i_sext),
      (inst === ORI) -> (rs1_data | imm_i_sext),
      (inst === XORI) -> (rs1_data ^ imm_i_sext)
    )
  )

  when(
    inst === LW || inst === ADD || inst === ADDI || inst === SUB
      || inst === AND || inst === OR || inst === XOR || inst === ANDI
      || inst === ORI || inst === XORI
  ) {
    regfile(wb_addr) := wb_data
  }
```
@tab readme 
```md 
and x3, x5, x7
0x0072f1b3

or x3, x5, x7
0x0072e1b3

xor x3, x5, x7 
0x0072c1b3

andi x3, x5, 10 
0x00a2f193

ori x3, x5, 10 
0x00a2e193 

xori x3, x5, 10 
0x00a2c193
```
@tab hex 
```txt 
b3
f1
72
00
b3
e1
72
00
b3
c1
72
00
93
f1
a2
00
93
e1
a2
00
93
c1
a2
00
```
@tab 测试结果
```bash{4,6,8-10,16,18,20-22,28,30,32-34,40,42,44-46,52,54,56-58,64,66,68-70}
----------- 对应指令and x3, x5, x7 
pc_reg: 0x00000010
inst: 0x0072f1b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令 or x3, x5, x7 
pc_reg: 0x00000014
inst: 0x0072e1b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令xor x3, x5, x7 
pc_reg: 0x00000018
inst: 0x0072c1b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令andi x3, x5, 10 
pc_reg: 0x0000001c
inst: 0x00a2f193
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:  10
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x00000002
wb_data: 0x00000002
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令ori x3, x5, 10 
pc_reg: 0x00000020
inst: 0x00a2e193
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:  10
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f6e
wb_data: 0x80c50f6e
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令xori x3, x5, 10
pc_reg: 0x00000024
inst: 0x00a2c193
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:  10
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f6c
wb_data: 0x80c50f6c
dmem.wen: 0x0
dmem.wdata: 0x00000000
```
:::


### 优化译码器
你是否发现了代码存在重复运算的问题，而导致代码愈发冗长。  
例如AND和ANDI只有第二操作数不同，存在共用部分代码的可能性。  
:::details 
1. Constants, 定义在ListLookup中出现的常量  
2. ListLookup 
3. dmem_wen, 原本在MEM阶段对inst进行译码，现在整合到ListLookup中译码  
:::code-tabs #optimize
@tab Constants 
```scala 
  val EXE_FUN_LEN = 5
  val ALU_X       = 0.U(EXE_FUN_LEN.W)
  val ALU_ADD     = 1.U(EXE_FUN_LEN.W)
  val ALU_SUB     = 2.U(EXE_FUN_LEN.W)
  val ALU_AND     = 3.U(EXE_FUN_LEN.W)
  val ALU_OR      = 4.U(EXE_FUN_LEN.W)
  val ALU_XOR     = 5.U(EXE_FUN_LEN.W)

  val OP1_LEN = 2
  val OP1_RS1 = 0.U(OP1_LEN.W)

  val OP2_LEN = 3
  val OP2_X   = 0.U(OP2_LEN.W)
  val OP2_RS2 = 1.U(OP2_LEN.W)
  val OP2_IMI = 2.U(OP2_LEN.W)
  val OP2_IMS = 3.U(OP2_LEN.W)

  val MEN_LEN = 2
  val MEN_X   = 0.U(MEN_LEN.W)
  val MEN_S   = 1.U(MEN_LEN.W)
  val MEN_V   = 2.U(MEN_LEN.W)
```
@tab Core 
```scala 
  val csignals = ListLookup(
    inst,
    List(ALU_X, OP1_RS1, OP2_RS2, MEN_X),
    Array(
      LW   -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X),
      SW   -> List(ALU_ADD, OP1_RS1, OP2_IMS, MEN_S),
      ADD  -> List(ALU_ADD, OP1_RS1, OP2_RS2, MEN_X),
      ADDI -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X),
      SUB  -> List(ALU_SUB, OP1_RS1, OP2_RS2, MEN_X),
      AND  -> List(ALU_AND, OP1_RS1, OP2_RS2, MEN_X),
      OR   -> List(ALU_OR, OP1_RS1, OP2_RS2, MEN_X),
      XOR  -> List(ALU_XOR, OP1_RS1, OP2_RS2, MEN_X),
      ANDI -> List(ALU_AND, OP1_RS1, OP2_IMS, MEN_X),
      ORI  -> List(ALU_OR, OP1_RS1, OP2_IMS, MEN_X),
      XORI -> List(ALU_XOR, OP1_RS1, OP2_IMS, MEN_X)
    )
  )
  val exe_fun :: op1_sel :: op2_sel :: mem_wen :: Nil = csignals
  val op1_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (op1_sel === OP1_RS1) -> rs1_data
    )
  )
  val op2_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (op2_sel === OP2_RS2) -> rs2_data,
      (op2_sel === OP2_IMI) -> imm_i_sext,
      (op2_sel === OP2_IMS) -> imm_s_sext
    )
  )

  val alu_out = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (exe_fun === ALU_ADD) -> (op1_data + op2_data),
      (exe_fun === ALU_SUB) -> (op1_data - op2_data),
      (exe_fun === ALU_AND) -> (op1_data & op2_data),
      (exe_fun === ALU_OR)  -> (op1_data | op2_data),
      (exe_fun === ALU_XOR) -> (op1_data ^ op2_data)
    )
  )


  io.dmem.write_enable := mem_wen

```
:::

### 译码信号新增 rf_wen , wb_sel 
在ID阶段预先对wb_data的识别信号和回写有效信号进行译码，保存在rf_wen和wb_sel中。  
强化译码器之后，由于不必将inst传递给EX以后的阶段，还得以提高电路和代码的可读性
:::details 
:::code-tabs #preprocess
@tab Constants 
```scala 
  val REN_LEN = 2
  val REN_X   = 0.U(REN_LEN.W)
  val REN_S   = 1.U(REN_LEN.W)
  val REN_V   = 2.U(REN_LEN.W)

  val WB_SEL_LEN = 3
  val WB_X       = 0.U(WB_SEL_LEN.W)
  val WB_ALU     = 1.U(WB_SEL_LEN.W)
  val WB_MEM     = 2.U(WB_SEL_LEN.W)
```
@tab Core 
```scala 
  val csignals = ListLookup(
    inst,
    List(ALU_X, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_MEM),
    Array(
      LW   -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_MEM),
      SW   -> List(ALU_ADD, OP1_RS1, OP2_IMS, MEN_S, REN_X, WB_X),
      ADD  -> List(ALU_ADD, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      ADDI -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU),
      SUB  -> List(ALU_SUB, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      AND  -> List(ALU_AND, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      OR   -> List(ALU_OR, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      XOR  -> List(ALU_XOR, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      ANDI -> List(ALU_AND, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU),
      ORI  -> List(ALU_OR, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU),
      XORI -> List(ALU_XOR, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU)
    )
  )
  val exe_fun :: op1_sel :: op2_sel :: mem_wen :: rf_wen :: wb_sel :: Nil =
    csignals


  val wb_data = MuxCase(
    alu_out,
    Seq(
      (wb_sel === WB_MEM) -> io.dmem.read_data
    )
  )
  when(rf_wen === REN_S) {
    regfile(wb_addr) := wb_data
  }
```
:::

### 移位运算的实现
`sll, srl, sra, slli, srli, srai`
:::details 
:::code-tabs #shift 
@tab Constants
```scala 
  val ALU_SLL     = 6.U(EXE_FUN_LEN.W)
  val ALU_SRL     = 7.U(EXE_FUN_LEN.W)
  val ALU_SRA     = 8.U(EXE_FUN_LEN.W)

```
@tab Core 
```scala 
      SLL  -> List(ALU_SLL, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      SRL  -> List(ALU_SRL, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      SRA  -> List(ALU_SRA, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      SLLI -> List(ALU_SLL, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU),
      SRLI -> List(ALU_SRL, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU),
      SRAI -> List(ALU_SRA, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU)

      (exe_fun === ALU_SLL) -> (op1_data << op2_data(4, 0))(31, 0),
      (exe_fun === ALU_SRL) -> (op1_data >> op2_data(4, 0)),
      (exe_fun === ALU_SRA) -> (op1_data.asSInt >> op2_data(4, 0)).asUInt

```
@tab readme 
```md 
sll x3, x5, x7 
0x007291b3

srl x3, x5, x7 
0x0072d1b3

sra x3, x5, x7 
0x4072d1b3
```
@tab hex 
```txt 
b3 
91 
72 
00 
b3 
d1 
72 
00 
b3 
d1 
72 
40 
```
@tab 测试
```bash{4,6,8-10,16,18,20-22,28,30,32-34}
----------- 对应指令sll x3, x5, x7 
pc_reg: 0x00000028
inst: 0x007291b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令srl x3, x5, x7 
pc_reg: 0x0000002c
inst: 0x0072d1b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令sra x3, x5, x7
pc_reg: 0x00000030
inst: 0x4072d1b3
rs1_addr:   5
rs1_data: 0x80c50f66
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x80c50f66
wb_data: 0x80c50f66
dmem.wen: 0x0
dmem.wdata: 0x00000000
```
:::

### 比较运算的实现  
`slt, sltu, slti, sltui`  
SLT指令比较两个操作数的大小，若op1小于op2，则指定寄存器写入1，否则写入0.
:::details
:::code-tabs #slt
@tab Constants 
```scala
  val ALU_SLT     = 9.U(EXE_FUN_LEN.W)
  val ALU_SLTU    = 10.U(EXE_FUN_LEN.W)
```
@tab Core 
```scala 

      SLT   -> List(ALU_SLT, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      SLTU  -> List(ALU_SLTU, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU),
      SLTI  -> List(ALU_SLT, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU),
      SLTIU -> List(ALU_SLTU, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU)


      (exe_fun === ALU_SLT)  -> (op1_data.asSInt < op2_data.asSInt).asUInt,
      (exe_fun === ALU_SLTU) -> (op1_data < op2_data).asUInt
```
@tab readme 
```md 
slt x3, x5, x7 
0x0072a1b3 
sltu x3, x5, x7 
0x0072b1b3 
slti x5, x7, 15 
0x00f3a293 
sltiu x5, x7, 15 
0x00f3b293 
```
@tab hex 
```txt 
b3 
a1
72
00
b3 
b1
72
00
93 
a2
f3
00
93 
b2
f3
00
```
@tab 测试
```scala{4,6,8-10,16,18,20-22,28,32-34,40,44-46}
----------- 对应指令slt x3, x5, x7
pc_reg: 0x00000034
inst: 0x0072a1b3
rs1_addr:   5
rs1_data: 0x00802303
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令sltu x3, x5, x7
pc_reg: 0x00000038
inst: 0x0072b1b3
rs1_addr:   5
rs1_data: 0x00802303
rs2_addr:   7
rs2_data: 0x00000000
wb_addr, 0x03
alu_out: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令slti x5, x7, 15
pc_reg: 0x0000003c
inst: 0x00f3a293
rs1_addr:   7
rs1_data: 0x00000000
rs2_addr:  15
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x00000001
wb_data: 0x00000001
dmem.wen: 0x0
dmem.wdata: 0x406287b3
----------- 对应指令sltiu x5, x7, 15
pc_reg: 0x00000040
inst: 0x00f3b293
rs1_addr:   7
rs1_data: 0x00000000
rs2_addr:  15
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x00000001
wb_data: 0x00000001
dmem.wen: 0x0
dmem.wdata: 0x406287b3

```
:::

### 分支指令的实现
`beq, bne, blt, bge, bltu, bgeu`  
分支指令更新的是PC寄存器，而不是通用寄存器的值。  
位配置：B格式  
:::important 立即数`imm_b`的提取方法
1. 指令位列中只制定了立即数12位的高11位，imm[0]始终为0. 立即数始终是2的倍数。
2. 立即数的配置并非有序排列，即使指令格式不同，符号扩展后的立即数的每一位都尽可能对应了指令位列中的相同位。
> 例如进行32位符号扩展时，立即数的最高位始终配置为inst[31], 所以无论是何种指令类型，都可以共享立即数的符号扩展处理
:::
:::details
:::code-tabs #branch
@tab Constants 
```scala 
  val BR_BEQ  = 11.U(EXE_FUN_LEN.W)
  val BR_BNE  = 12.U(EXE_FUN_LEN.W)
  val BR_BLT  = 13.U(EXE_FUN_LEN.W)
  val BR_BGE  = 14.U(EXE_FUN_LEN.W)
  val BR_BLTU = 15.U(EXE_FUN_LEN.W)
  val BR_BGEU = 16.U(EXE_FUN_LEN.W)

```
@tab Core 
```scala 
  val pc_plus4  = pc_reg + 4.U(WORD_LEN.W)
  val br_flg    = Wire(Bool())
  val br_target = Wire(UInt(WORD_LEN.W))
  val pc_next = MuxCase(
    pc_plus4,
    Seq(
      br_flg -> br_target
    )
  )
  pc_reg       := pc_next

  val imm_b      = Cat(inst(31), inst(7), inst(30, 25), inst(11, 8))
  val imm_b_sext = Cat(Fill(19, imm_b(11)), imm_b, 0.U(1.W))


      BEQ   -> List(BR_BEQ, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X),
      BNE   -> List(BR_BNE, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X),
      BGE   -> List(BR_BLT, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X),
      BGEU  -> List(BR_BGE, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X),
      BLT   -> List(BR_BLTU, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X),
      BLTU  -> List(BR_BGEU, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X)

  br_flg := MuxCase(
    false.B,
    Seq(
      (exe_fun === BR_BEQ)  -> (op1_data === op2_data),
      (exe_fun === BR_BNE)  -> !(op1_data === op2_data),
      (exe_fun === BR_BLT)  -> (op1_data.asSInt < op2_data.asSInt),
      (exe_fun === BR_BGE)  -> !(op1_data.asSInt < op2_data.asSInt),
      (exe_fun === BR_BLTU) -> (op1_data < op2_data),
      (exe_fun === BR_BGEU) -> !(op1_data < op2_data)
    )
  )


  br_target := pc_reg + imm_b_sext
  

  printf(p"imm_b: 0x${Hexadecimal(imm_b)}\n")
  printf(p"imm_b_sext: 0x${Hexadecimal(imm_b_sext)}\n")
  printf(p"branch.flag: ${br_flg}\n")
  printf(p"branch.target: 0x${Hexadecimal(br_target)}\n")
```
@tab readme 
```md
beq x4, x5, 12 
0x00520663
```
@tab hex 
```txt 
63
06
52
00
```
@tab 测试
```bash{2,4-7,9,14,16} 
----------- 对应指令beq x4, x5, 12
pc_reg: 0x00000044
inst: 0x00520663
rs1_addr:   4
rs1_data: 0x00000000
rs2_addr:   5
rs2_data: 0x00000001
wb_addr, 0x0c
alu_out: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000001
imm_b: 0x006
imm_b_sext: 0x0000000c
branch.flag:  0
branch.target: 0x00000050
```
:::


### 跳转指令的实现  
`jal, jalr`  
分支指令仅在条件成立时跳转，而跳转指令是无条件跳转的。  
位配置：分别是J格式、I格式  
JAL和分支指令的B格式有相同点：最低位不需要指令位定义，始终为0  
JALR，下一个循环的PC为 `(x[rs1] + sext(imm_i)) & ~1`  
> 此AND运算的作用是最低位归零，  
> JAL和JALR指令中跳转目标地址的最低位始终为0，这种规定增加了可跳转的宽度  

:::details
rd寄存器中保存的是当前PC+4，通常rd寄存器设为ra寄存器  
:::code-tabs #jmp
@tab Constants 
```scala
  val ALU_JALR = 17.U(EXE_FUN_LEN.W)

  val OP1_PC  = 1.U(OP1_LEN.W)

  val OP2_IMJ = 4.U(OP2_LEN.W)

  val WB_PC      = 2.U(WB_SEL_LEN.W)
```
@tab Core 
```scala 
// move upstream
val inst      = io.imem.inst

val jmp_flg   = (inst === JAL || inst === JALR)

// move up
val alu_out   = Wire(UInt(WORD_LEN.W))


  val pc_next = MuxCase(
    pc_plus4,
    Seq(
      br_flg  -> br_target,
      jmp_flg -> alu_out
    )
  )

// val inst = io.imem.inst

  val imm_j      = Cat(inst(31), inst(19, 12), inst(20), inst(30, 21))
  val imm_j_sext = Cat(Fill(11, imm_j(19)), imm_j, 0.U(1.W))

      JAL   -> List(ALU_ADD, OP1_PC, OP2_IMJ, MEN_X, REN_S, WB_PC),
      JALR  -> List(ALU_JALR, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_PC)


  val op1_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (op1_sel === OP1_RS1) -> rs1_data,
      (op1_sel === OP1_PC)  -> pc_reg
    )
  )
  val op2_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (op2_sel === OP2_RS2) -> rs2_data,
      (op2_sel === OP2_IMI) -> imm_i_sext,
      (op2_sel === OP2_IMS) -> imm_s_sext,
      (op2_sel === OP2_IMJ) -> imm_j_sext
    )
  )

  alu_out := MuxCase(
    0.U(WORD_LEN.W),
    Seq(
...
      (exe_fun === ALU_JALR) -> ((op1_data + op2_data) & ~1.U(WORD_LEN.W))
    )
  )

  val wb_data = MuxCase(alu_out, Seq(
    (wb_sel === WB_MEM) -> io.dmem.read_data,
    (wb_sel === WB_PC) -> pc_plus4
  ))

  printf(p"imm_j_sext: 0x${Hexadecimal(imm_b_sext)}\n")

  printf(p"jmp.flag: ${jmp_flg}\n")

```
@tab readme 
```md 
jal x10, 8
0x0080056f
```
@tab hex 
```txt 
6f
05
80
00
```
@tab 测试
```bash{8,10,17-18}
----------- 对应指令jal x10, 8
pc_reg: 0x00000048
inst: 0x0080056f
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
wb_addr, 0x0a
alu_out: 0x00000050
wb_data: 0x0000004c
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x005
imm_b_sext: 0x0000000a
imm_j_sext: 0x0000000a
branch.flag:  0
branch.target: 0x00000052
jmp.flag:  1
```

:::

### 立即数加载指令的实现  
`lui, auipc`  
指令内容  
lui: `sext(imm_u[31:12] << 12)`  
auipc: `pc + sext(imm_u[31:12] << 12)`  
:::details
AUIPC指令用于计算PC相对地址  
> 组合，AUIPC和JARL指令  
> 用AUIPC指令指定立即数的高20位，用JALR指令指定立即数的低12位，跳转到PC的32位范围内任意相对地址。
:::code-tabs #imm
@tab Constants 
```scala
OP1_X在初始就该引入

  val OP2_IMU = 5.U(OP2_LEN.W)
```
@tab Core 
```scala
  val imm_u         = inst(31, 12)
  val imm_u_shifted = Cat(imm_u, Fill(12, 0.U))

      LUI   -> List(ALU_ADD, OP1_X, OP2_IMU, MEN_X, REN_S, WB_ALU),
      AUIPC -> List(ALU_ADD, OP1_PC, OP2_IMU, MEN_X, REN_S, WB_ALU)

      (op2_sel === OP2_IMJ) -> imm_j_sext,
      (op2_sel === OP2_IMU) -> imm_u_shifted

  printf(p"imm_u: 0x${Hexadecimal(imm_u)}\n")
  printf(p"imm_u_shifted: 0x${Hexadecimal(imm_u_shifted)}\n")

```
@tab readme 
```md 
auipc x2, 2
0x00002117

lui x2, 2
0x00002137
```

@tab hex 
```bash
17
21
00
00
37
21
00
00
```
@tab 测试
```bash{2,8,10,17,28,30,37}
----------- 对应指令auipc x2, 2
pc_reg: 0x00000048
inst: 0x00002117 
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
wb_addr, 0x02
alu_out: 0x00002048
wb_data: 0x00002048
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x001
imm_b_sext: 0x00000002
imm_j_sext: 0x00000002
imm_u: 0x00002
imm_u_shifted: 0x00002000
branch.flag:  0
branch.target: 0x0000004a
jmp.flag:  0
----------- 对应指令lui x2, 2
pc_reg: 0x0000004c
inst: 0x00002137
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
wb_addr, 0x02
alu_out: 0x00002000
wb_data: 0x00002000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x001
imm_b_sext: 0x00000002
imm_j_sext: 0x00000002
imm_u: 0x00002
imm_u_shifted: 0x00002000
branch.flag:  0
branch.target: 0x0000004e
jmp.flag:  0
```
:::

### CSR指令的实现  
CSR，控制与状态寄存器  
控制寄存器用于中断/异常处理的管理、虚拟存储器的设定  
状态寄存器还能表示CPU的状态  
:::details
:::code-tabs #csr
@tab Constants
```scala 
  val ALU_COPY1 = 18.U(EXE_FUN_LEN.W) 
  val OP1_IMZ = 3.U(OP1_LEN.W)
  val WB_CSR = 3.U(WB_SEL_LEN.W)

  val CSR_LEN = 3
  val CSR_X = 0.U(CSR_LEN.W)
  val CSR_W = 1.U(CSR_LEN.W)
  val CSR_S = 2.U(CSR_LEN.W)
  val CSR_C = 3.U(CSR_LEN.W)

```
@tab Core 
```scala 
  val csr_regfile = Mem(4096, UInt(WORD_LEN.W)) 

  val csr_addr = inst(31,20)
  val csr_rdata = csr_regfile(csr_addr) 

  val imm_z = inst(19, 15)
  val imm_z_uext = Cat(Fill(27, 0.U), imm_z)

  val csignals = ListLookup(
    inst, List(ALU_X, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_MEM, CSR_X), 

      CSRRW -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_W),
      CSRRWI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_W),
      CSRRS -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_S),
      CSRRSI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_S),
      CSRRC -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_C),
      CSRRCI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_C),

  val exe_fun :: op1_sel :: op2_sel :: mem_wen :: rf_wen :: wb_sel :: csr_cmd ::Nil = csignals

 val csr_wdata = MuxCase(0.U(WORD_LEN.W), Seq(
    (csr_cmd === CSR_W) -> op1_data,
    (csr_cmd === CSR_S) -> (csr_rdata | op1_data),
    (csr_cmd === CSR_C) -> (csr_rdata &  ~op1_data),
    ))
  when(csr_cmd > 0.U) {
    csr_regfile(csr_addr) := csr_wdata
  }
  val wb_data = MuxCase(alu_out, Seq(
    (wb_sel === WB_MEM) -> io.dmem.read_data,
    (wb_sel === WB_PC) -> pc_plus4,
    (wb_sel === WB_CSR) -> csr_rdata,
  ))
  printf(p"csr_addr:  0x${Hexadecimal(csr_addr)}\n")
  printf(p"csr_rdata: 0x${Hexadecimal(csr_rdata)}\n")

  printf(p"csr_wdata: 0x${Hexadecimal(csr_rdata)}\n")

  printf(p"imm_z: 0x${Hexadecimal(imm_z)}\n")
  printf(p"imm_z_uext: 0x${Hexadecimal(imm_z_uext)}\n")
```
@tab readme 
```md
csrrc x2, mstatus, x0
0x30003173

csrrci x2, mstatus, 2
0x30017173

csrrs x2, mstatus, x0
0x30002173

csrrsi x2, mstatus, 2
0x30016173

csrrw x2, mstatus, x2
0x30011173

csrrwi x2, mstatus, 2
0x30015173
```
@tab hex 
```txt 
73
31
00
30
73
71
01
30
73
21
00
30
73
61
01
30 
73
11
00
30 
73
51
01
30 
```
@tab 测试 
```bash{8,10,33,58,83,108,133}
----------- 对应指令csrrc x2, mstatus, x0
pc_reg: 0x00000050
inst: 0x30003173
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:   0x300
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30003
imm_u_shifted: 0x30003000
imm_z: 0x00
imm_z_uext: 0x00000000
branch.flag:  0
branch.target: 0x00000352
jmp.flag:  0
----------- 对应指令csrrci x2, mstatus, 2
pc_reg: 0x00000054
inst: 0x30017173
rs1_addr:   2
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:   0x300
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30017
imm_u_shifted: 0x30017000
imm_z: 0x02
imm_z_uext: 0x00000002
branch.flag:  0
branch.target: 0x00000356
jmp.flag:  0
----------- 对应指令csrrs x2, mstatus, x0
pc_reg: 0x00000058
inst: 0x30002173
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:  0x300 
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30002
imm_u_shifted: 0x30002000
imm_z: 0x00
imm_z_uext: 0x00000000
branch.flag:  0
branch.target: 0x0000035a
jmp.flag:  0
----------- 对应指令csrrsi x2, mstatus, 2
pc_reg: 0x0000005c
inst: 0x30016173
rs1_addr:   2
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:   0x300
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30016
imm_u_shifted: 0x30016000
imm_z: 0x02
imm_z_uext: 0x00000002
branch.flag:  0
branch.target: 0x0000035e
jmp.flag:  0
----------- 对应指令csrrw x2, mstatus, x2
pc_reg: 0x00000060
inst: 0x30001173
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:   0x300
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30001
imm_u_shifted: 0x30001000
imm_z: 0x00
imm_z_uext: 0x00000000
branch.flag:  0
branch.target: 0x00000362
jmp.flag:  0
----------- 对应指令csrrwi x2, mstatus, 2
pc_reg: 0x00000064
inst: 0x30015173
rs1_addr:   2
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr:   0x300
csr_rdata: 0x00000000
wb_addr, 0x02
alu_out: 0x00000000
csr_wdata: 0x00000000
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x181
imm_b_sext: 0x00000302
imm_j_sext: 0x00000302
imm_u: 0x30015
imm_u_shifted: 0x30015000
imm_z: 0x02
imm_z_uext: 0x00000002
branch.flag:  0
branch.target: 0x00000366
jmp.flag:  0
```
:::

### ECALL的实现  
ECALL，是在发生异常时调用运行环境的指令。  
按惯例，属于I格式，但是第7-31位均为0  
具体处理内容：根据CPU模式，将对应值写入mcause寄存器, 跳转到mtvec中保存的陷阱向量地址  
:::details
> trap_vector描述了异常发生时的处理

本次Chisel实现的CPU无运行环境，所以到trap_vector的迁移会触发异常
:::code-tabs #ecall
@tab Constants 
```scala 
  val CSR_ADDR_LEN = 12 

  val CSR_E = 4.U(CSR_LEN.W) 
```
@tab Core 
```scala 
  val pc_next = MuxCase(
    pc_plus4,
    Seq(
      br_flg           -> br_target,
      jmp_flg          -> alu_out,
      (inst === ECALL) -> csr_regfile(0x305)
    )
  )

  // val csr_addr      = inst(31, 20)
  // val csr_rdata     = csr_regfile(csr_addr)

      ECALL  -> List(ALU_X, OP1_X, OP2_X, MEN_X, REN_X, WB_X, CSR_E)

// 放在取指阶段，解析完ECALL之后
  val csr_addr  = Mux(csr_cmd === CSR_E, 0x342.U(CSR_ADDR_LEN.W), inst(31, 20))
  val csr_rdata = csr_regfile(csr_addr)
  val csr_wdata = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (csr_cmd === CSR_W) -> op1_data,
      (csr_cmd === CSR_S) -> (csr_rdata | op1_data),
      (csr_cmd === CSR_C) -> (csr_rdata & ~op1_data),
      (csr_cmd === CSR_E) -> 11.U(WORD_LEN.W)
    )
  )

  when(csr_cmd > 0.U) {
    csr_regfile(csr_addr) := csr_wdata
  }

```
@tab readme 
```md
ecall
0x00000073
```
@tab 测试
```bash{8-9}
-----------
pc_reg: 0x00000068
inst: 0x00000073
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   0
rs2_data: 0x00000000
csr_addr: 0x342
csr_rdata: 0x0000000b
wb_addr, 0x00
alu_out: 0x00000000
csr_wdata: 0x0000000b
wb_data: 0x00000000
dmem.wen: 0x0
dmem.wdata: 0x00000000
imm_b: 0x000
imm_b_sext: 0x00000000
imm_j_sext: 0x00000000
imm_u: 0x00000
imm_u_shifted: 0x00000000
imm_z: 0x00
imm_z_uext: 0x00000000
branch.flag:  0
branch.target: 0x00000068
jmp.flag:  0
-----------
```
:::

## 标准测试：使用riscv-tests
[工具包介绍](/trouble/riscv-test.html#下载编译)   
上述测试，通过手动提供机器语言属于简单但不完整的测试，  
最后我们应该使用工具包简易且全面地测试指令实现的正确性。  
:::details 
:::code-tabs #riscvtests 
@tab 下载编译
```bash 
git clone -b master --single-branch https://github.com/riscv/riscv-tests 
cd riscv-tests 
git submodule update --init --recursive

修改riscv-tests/env/p/link.ld
SECTIONS {
  .=0x00000000; // 起始地址修改, 原 0x8000_0000
}


autoconf 
./configure --prefix=$RISCV/target 
make 
make install

# 迁移
mkdir -p ~/my-tests/elf
sudo cp rv32*i-p-* ~/my-tests/elf
```
@tab 批量生成hex 
```sh 
#!/bin/bash

FILES=~/my-tests/elf/rv32*i-p-*
SAVE_DIR=~/my-tests/hex

for f in $FILES; do
	FILE_NAME="${f##*/}"              
	if [[ ${f##*.} != "dump" ]]; then 
		# elf2hex 16 4096 $f >$SAVE_DIR/${FILE_NAME}.hex.txt
		riscv32-unknown-elf-objcopy -O binary $f $SAVE_DIR/$FILE_NAME.bin
		od -An -tx1 -w1 -v $SAVE_DIR/$FILE_NAME.bin >$SAVE_DIR/$FILE_NAME.hex.txt
		rm -f $SAVE_DIR/$FILE_NAME.bin
	fi
done
```
@tab 迁移到项目 
```sh 
#!/bin/bash

FILES=~/my-tests/hex/rv32*i-p-*
TARGET_DIR=~/sandbox/single_cpu/chisel-template/src/riscvtest

for f in $FILES; do
        cp $f $TARGET_DIR
done
```

@tab RiscvtestSpec 
```scala
package single
import chisel3._
import chiseltest._
import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._
import java.io.File

class RiscvtestSpec extends AnyFreeSpec with ChiselScalatestTester {
  "should pass rv32*i-p-*" in {
    def getAllFilesInDirectory(dirPath: String): List[File] = {
      val directory = new File(dirPath)
      if (directory.exists && directory.isDirectory) {
        directory.listFiles.filter(_.isFile).toList
      } else {
        List.empty[File]
      }
    }
    val directoryPath = "src/riscvtest"
    val allFiles      = getAllFilesInDirectory(directoryPath)
    allFiles.foreach(file =>
      test(new Top(file.toString())) { dut =>
        while (!dut.io.exit.peek().litToBoolean) {
          dut.clock.step()
        }
        dut.io.gp.expect(1.U)
      }
    )
  }
}
```

