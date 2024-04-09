---
title: 1. 单周期实现
icon: circle-dot
headerDepth: 3
---

:::details 初始化
:::code-tabs #shell 
@tab .scalafmt.conf 
```conf 
version = "3.7.15"
runner.dialect = scala213
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
::: code-tabs #shell 
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


## 译码
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
pc_reg: 0x00000000
inst: 0x00802303
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
-----------  对应 lw x6, 8(x0):
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x00000000
----------- 对应 add x5, x6, x6 
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x00000000
----------- 对应 sub x15, x5, x6
```
:::

### lw
:::details 代码
:::code-tabs #shell 
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
```bash 
sbt "testOnly single.BasicSpec"

打印调试信息:
pc_reg: 0x00000000
inst: 0x00802303
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
wb_addr, 0x06
alu_out: 0x00000008
wb_data: 0x406287b3
----------- 对应指令: lw x6, 8(x0)
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x406287b3
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x00000000
wb_data: 0x00802303
----------- 对应指令： add x5, x6, x6
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x0f
alu_out: 0x00000000
wb_data: 0x00802303
----------- 对应指令：sub x15, x5, x6

```
:::


### sw 

:::details 代码
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
```bash 
pc_reg: 0x00000000
inst: 0x00802303
rs1_addr:   0
rs1_data: 0x00000000
rs2_addr:   8
rs2_data: 0x00000000
wb_addr, 0x06
alu_out: 0x00000008
wb_data: 0x406287b3
dmem.wen: 0x0
dmem.wdata: 0x00000000
----------- 对应指令 lw x6, 8(x0)
pc_reg: 0x00000004
inst: 0x006302b3
rs1_addr:   6
rs1_data: 0x406287b3
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x05
alu_out: 0x00000000
wb_data: 0x00802303
dmem.wen: 0x0
dmem.wdata: 0x406287b3
----------- 对应指令 add x5, x6, x6 
pc_reg: 0x00000008
inst: 0x406287b3
rs1_addr:   5
rs1_data: 0x00000000
rs2_addr:   6
rs2_data: 0x406287b3
wb_addr, 0x0f
alu_out: 0x00000000
wb_data: 0x00802303
dmem.wen: 0x0
dmem.wdata: 0x406287b3
----------- 对应指令 sub x15, x5, x6 
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
----------- 对应指令 sw x6, 16(x0)
```
:::

### add sub 

:::details 代码
:::code-tabs #shell 
@tab 

:::
