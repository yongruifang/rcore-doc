---
title: 3. Chisel编程(实现取指译码)
icon: tag
headerDepth: 3
---
## 目标
1. 设计一个连续取指+译指的电路
2. 入门简单数据通路
3. 运用chisel语法编写模块

## 内容
### 1. 译码器的设计
完成add, sub, lw, sw指令译码。其他指令一律译为nop
```normal
Input: Instr_word[31:0]
Output: 
    add_op
    sub_op
    lw_op
    sw_op
    nop
```
实现代码，完成波形仿真测试。
指令测试样例：
```asmatmel
add x1, x2, x3 : 0x003100b3 b000000_00010_00011_00001_00000_100000 
sub x0, x5, x6 : 0x40628033 b000000_00101_00110_00000_00000_100010 
lw x5, 100(x2) : 0x06432283 b100011_00010_00101_00000_00001_100100 
sw x5, 104(x2) : 0x06512423 b101011_00010_00101_00000_00001_101000 
jal ra, 100    : 0x064000ef b00000110010000000000_00001_1101111 
```

### 2. 寄存器文件的设计
32-bit的寄存器 x 32 
允许两读一写
- r0固定读出0
- 输入端口 
```normal
rs1, rs2, wb_data, reg_wb, rf_wren
```
- 输出端口
```normal
rs1_out, rs2_out
```
- 寄存器内部保存的初始数值设置为寄存器编号

测试
```normal
rs1=5, rs2=8, wb_data=0x1234, reg_wb=1, rf_wren=1 
观察输出波形以及对应寄存器的值
```

### 3. 实现32-word的指令存储器并组合模块。
内存: 32字指令存储器
地址0存储4条指令。
```asmatmel
add x1, x2, x3 : 0x003100b3
sub x0, x5, x6 : 0x40628033
lw x5, 100(x2) : 0x06432283
sw x5, 104(x2) : 0x06512423
jal ra, 100    : 0x064000ef
```
- 组合 指令存储器，寄存器文件，译码器。
PC初始值为0  
目标：逐条地取指、译码。  
观察四条指令的执行过程的波形

## 步骤
### 1. 选择build.sbt构建文件
scala库中与Chisel和Chisel test相关的部分是在构建过程中通过Maven仓库下载的。
build.sbt文件无需手动编写，官方推荐克隆[chisel-template](https://github.com/chipsalliance/chisel-template)
```bash
git clone https://github.com/chipsalliance/chisel-template.git example
cd example 
sbt run 
```
> 因为chisel-template更新的频率较快，所以提供本次使用的`build.sbt`：
```scala 
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
### 2. 编写Decoder.scala和DecoderSpec.scala 
:::code-tabs#shell 
@tab Decoder 
```scala 
package circuit
import chisel3._
import chisel3.util._
object Instructions {
  def ADD = BitPat("b0000000??????????000?????0110011")
  def SUB = BitPat("b0100000??????????000?????0110011")
  def LW = BitPat("b?????????????????010?????0000011")
  def SW = BitPat("b?????????????????010?????0100011")
  val ADD_ON = 1.U(1.W)
  val ADD_OFF = 0.U(1.W)
  val SUB_ON = 1.U(1.W)
  val SUB_OFF = 0.U(1.W)
  val LW_ON = 1.U(1.W)
  val LW_OFF = 0.U(1.W)
  val SW_ON = 1.U(1.W)
  val SW_OFF = 0.U(1.W)
  val NOP_ON = 1.U(1.W)
  val NOP_OFF = 0.U(1.W)
}

class DecoderSignals extends Bundle {
  val Instr_word = Input(UInt(32.W))
  val add_op = Output(UInt(1.W))
  val sub_op = Output(UInt(1.W))
  val lw_op = Output(UInt(1.W))
  val sw_op = Output(UInt(1.W))
  val nop = Output(UInt(1.W))
}

class Decoder extends Module {
  val io = IO(new DecoderSignals())
  val decoderSignals = ListLookup(
    io.Instr_word,
    List(
      Instructions.ADD_OFF,
      Instructions.SUB_OFF,
      Instructions.LW_OFF,
      Instructions.SW_OFF,
      Instructions.NOP_ON
    ),
    Array(
      Instructions.ADD -> List(
        Instructions.ADD_ON,
        Instructions.SUB_OFF,
        Instructions.LW_OFF,
        Instructions.SW_OFF,
        Instructions.NOP_OFF
      ),
      Instructions.SUB -> List(
        Instructions.ADD_OFF,
        Instructions.SUB_ON,
        Instructions.LW_OFF,
        Instructions.SW_OFF,
        Instructions.NOP_OFF
      ),
      Instructions.LW -> List(
        Instructions.ADD_OFF,
        Instructions.SUB_OFF,
        Instructions.LW_ON,
        Instructions.SW_OFF,
        Instructions.NOP_OFF
      ),
      Instructions.SW -> List(
        Instructions.ADD_OFF,
        Instructions.SUB_OFF,
        Instructions.LW_OFF,
        Instructions.SW_ON,
        Instructions.NOP_OFF
      )
    )
  )
  val add_op :: sub_op :: lw_op :: sw_op :: nop :: Nil = decoderSignals
  io.add_op := add_op
  io.sub_op := sub_op
  io.lw_op := lw_op
  io.sw_op := sw_op
  io.nop := nop
}
```
@tab DecoderSpec 
```scala 
package circuit

import chisel3._
import chiseltest._

import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class DecoderSpec extends AnyFreeSpec with ChiselScalatestTester {
  "Decoder: add x1, x2, x3" in {
    test(new Decoder) { dut =>
      dut.io.Instr_word.poke("0x003100b3".U)
      dut.io.add_op.expect(Instructions.ADD_ON)
      dut.io.sub_op.expect(Instructions.SUB_OFF)
      dut.io.lw_op.expect(Instructions.LW_OFF)
      dut.io.sw_op.expect(Instructions.SW_OFF)
      dut.io.nop.expect(Instructions.NOP_OFF)
      dut.clock.step()
    }
  }
}
```
:::


### 3. 编写Regfile和RegfileSpec
::: code-tabs#shell 
@tab Regfile 
```scala 
package circuit
import chisel3._

class RegfileIO extends Bundle {
  val RS1 = Input(UInt(5.W))
  val RS2 = Input(UInt(5.W))
  val WB_Data = Input(UInt(32.W))
  val Reg_WB = Input(UInt(5.W))
  val WB_Enable = Input(Bool())
  val RS1_Data = Output(UInt(32.W))
  val RS2_Data = Output(UInt(32.W))
}

class Regfile extends Module {
  val io = IO(new RegfileIO)
  val mem = RegInit(VecInit(Seq.tabulate(32)(_.U(32.W))))
  when(io.WB_Enable && io.Reg_WB =/= 0.U) {
    mem(io.Reg_WB) := io.WB_Data
  }
  io.RS1_Data := Mux(io.RS1.orR, mem(io.RS1), 0.U)
  io.RS2_Data := Mux(io.RS2.orR, mem(io.RS2), 0.U)
}

object Regfile extends App {
  emitVerilog(new Regfile, args)
}
```
@tab RegfileSpec 
```scala 
package circuit

import chisel3._
import chiseltest._

import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class RegfileSpec extends AnyFreeSpec with ChiselScalatestTester {
  "R0 should always be 0" in {
    test(new Regfile) { dut =>
      dut.reset.poke(true.B)
      dut.clock.step()
      dut.io.WB_Data.poke(1.U)
      dut.io.WB_Enable.poke(true.B)
      dut.io.Reg_WB.poke(0.U)
      dut.clock.step()
      dut.io.RS1.poke(0.U)
      dut.io.RS1_Data.expect(0.U)
    }
  }
}
```
:::


### 4. 编写IMemory和IMemorySpec

::: code-tabs#shell 
@tab IMemory  
```scala 
import chisel3._
import chisel3.util.experimental.loadMemoryFromFileInline
import circt.stage.ChiselStage

class IMemoryIO extends Bundle {
  val rdAddr = Input(UInt(5.W))
  val rdData = Output(UInt(32.W))
  val wrAddr = Input(UInt(5.W))
  val wrData = Input(UInt(32.W))
  val wrEna = Input(UInt(1.W))
}

class IMemory(memoryFile: String = "") extends Module {
  val io = IO(new IMemoryIO)
  val mem = SyncReadMem(1024, UInt(32.W))
  io.rdData := mem.read(io.rdAddr)
  io.rdData := mem(io.rdAddr)
  when(io.wrEna === 1.U) {
    mem.write(io.wrAddr, io.wrData)
  }
  if (memoryFile.trim().nonEmpty) {
    loadMemoryFromFileInline(mem, memoryFile)
  }
}
```
@tab IMemorySpec
```scala 
package circuit

import chisel3._
import chiseltest._

import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class IMemorySpec extends AnyFreeSpec with ChiselScalatestTester {
  "memory initial should work by example.hex.txt" in {
    test(new IMemory("src/hex/example.hex.txt")) { dut =>
      dut.io.rdAddr.poke(0.U)
      dut.clock.step()
      dut.io.rdData.expect(0x003100b3.U)
      dut.io.rdAddr.poke(1.U)
      dut.clock.step()
      dut.io.rdData.expect(0x40628033.U)
      dut.io.rdAddr.poke(2.U)
      dut.clock.step()
      dut.io.rdData.expect(0x06432283.U)
      dut.io.rdAddr.poke(3.U)
      dut.clock.step()
      dut.io.rdData.expect(0x06512423.U)
    }
  }
}
```
:::

### 5. 组合电路，实现取指译指的连续动作。
::: code-tabs#shell 
@tab Junction
```scala 
package circuit

import chisel3._

class PC extends Module {
  val io = IO(new Bundle {
    val pcIn = Input(UInt(32.W))
    val pc_sel = Input(UInt(1.W))
    val pcOut = Output(UInt(32.W))
  })
  val pc = RegInit(0.U(32.W))
  io.pcOut := pc
  pc := Mux(io.pc_sel === 1.U, io.pcIn, io.pcOut + 1.U)
}

class Junction(memoryFile: String = "") extends Module {
  val io = IO(new Bundle {
    val wrAddr = Input(UInt(5.W))
    val wrData = Input(UInt(32.W))
    val wrEna = Input(UInt(1.W))
    val add_op = Output(UInt(1.W))
    val sub_op = Output(UInt(1.W))
    val lw_op = Output(UInt(1.W))
    val sw_op = Output(UInt(1.W))
    val nop = Output(UInt(1.W))
    val RS1_out = Output(UInt(32.W))
    val RS2_out = Output(UInt(32.W))
    val pcIn = Input(UInt(5.W))
    val pc_sel = Input(UInt(1.W))
  })
  val decoder = Module(new Decoder)
  val regfile = Module(new Regfile)
  val mem = Module(new IMemory(memoryFile))
  val pc = Module(new PC)
  // pc conn
  pc.io.pc_sel := io.pc_sel
  pc.io.pcIn := io.pcIn
  // imemory conn
  mem.io.rdAddr := pc.io.pcOut
  mem.io.wrAddr := io.wrAddr
  mem.io.wrData := io.wrData
  mem.io.wrEna := io.wrEna
  // decoder conn
  decoder.io.Instr_word := mem.io.rdData
  io.add_op := decoder.io.add_op
  io.sub_op := decoder.io.sub_op
  io.lw_op := decoder.io.lw_op
  io.sw_op := decoder.io.sw_op
  io.nop := decoder.io.nop
  // regfile conn
  regfile.io.RS1 := mem.io.rdData(25, 21)
  regfile.io.RS2 := mem.io.rdData(20, 16)
  regfile.io.Reg_WB := mem.io.rdData(15, 11)
  regfile.io.WB_Enable := decoder.io.add_op | decoder.io.sub_op
  when(regfile.io.WB_Enable === 1.U) {
    when(decoder.io.add_op === 1.U) {
      regfile.io.WB_Data := regfile.io.RS1 + regfile.io.RS2
    }.elsewhen(decoder.io.sub_op === 1.U) {
      regfile.io.WB_Data := regfile.io.RS1 - regfile.io.RS2
    }.otherwise {
      regfile.io.WB_Data := 0.U
    }
  }.otherwise {
    regfile.io.WB_Data := 0.U
  }
  io.RS1_out := regfile.io.RS1_Data
  io.RS2_out := regfile.io.RS2_Data
  // print debug message
  printf("=======================\n")
  printf(cf"pc: ${pc.io.pcOut}\n")
  printf(cf"instr(hex): 0x${mem.io.rdData}%x\n")
  printf(cf"instr(bin): 0b${mem.io.rdData}%b\n")
  printf(
    cf"decoderOutput: ${decoder.io.add_op}, ${decoder.io.sub_op}, ${decoder.io.lw_op}, ${decoder.io.sw_op}\n"
  )
  printf("=======================\n")
}
```

@tab JunctionSpec
```scala 
package circuit

import chisel3._
import chiseltest._

import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class JunctionSpec extends AnyFreeSpec with ChiselScalatestTester {
  "test" in {
    test(new Junction("src/hex/example.hex.txt")) { dut =>
      dut.clock.step(1)
      dut.io.add_op.expect(1.U)
      dut.clock.step(1)
      println("success: add")
      dut.io.sub_op.expect(1.U)
      dut.clock.step(1)
      println("success: sub")
      dut.io.lw_op.expect(1.U)
      dut.clock.step(1)
      println("success: lw")
      dut.io.sw_op.expect(1.U)
      dut.clock.step(1)
      println("success: sw")
      dut.io.nop.expect(1.U)
      dut.clock.step(1)
      println("success: nop")
    }
  }
}
```
:::

