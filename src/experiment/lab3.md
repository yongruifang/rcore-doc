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
add r1, r2, r3 : b000000_00010_00011_00001_00000_100000
sub r0, r5, r6 : b000000_00101_00110_00000_00000_100010
lw r5, 100(r2) : b100011_00010_00101_00000_00001_100100
sw r5, 104(r2) : b101011_00010_00101_00000_00001_101000
jal 100 : b000011_00000_00000_00000_00000_000000
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
add r1, r2, r3 : b000000_00010_00011_00001_00000_100000
sub r0, r5, r6 : b000000_00101_00110_00000_00000_100010
lw r5, 100(r2) : b100011_00010_00101_00000_00001_100100
sw r5, 104(r2) : b101011_00010_00101_00000_00001_101000
jal 100 : b000011_00000_00000_00000_00000_000000
```
- 组合 指令存储器，寄存器文件，译码器。
PC初始值为0  
目标：逐条地取指、译码。  
观察四条指令的执行过程的波形

## 步骤
### 1. 关于sbt和build.sbt配置文件 
scala库中与Chisel和Chisel test相关的部分是在构建过程中通过Maven仓库下载的。
build.sbt文件无需手动编写，官方推荐克隆[chisel-template](https://github.com/chipsalliance/chisel-template)
```bash
git clone https://github.com/chipsalliance/chisel-template.git example
cd example 
sbt run 
```
### 2. 编写Decoder.scala和DecoderSpec.scala 
:::code-tabs#shell 
@tab Decoder 
```scala 
import chisel3._
import chisel3.util._

object Instructions {
  def ADD = BitPat("b000000???????????????00000100000")
  def SUB = BitPat("b000000???????????????00000100010")
  def LW = BitPat("b100011??????????????????????????")
  def SW = BitPat("b101011??????????????????????????")
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
import chisel3._
import chisel3.experimental.BundleLiterals._
import chisel3.simulator.EphemeralSimulator._
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.must.Matchers

/** This is a trivial example of how to run this Specification From within sbt
  * use:
  * {{{
  * testOnly
  * }}}
  * From a terminal shell use:
  * {{{
  * sbt 'testOnly '
  * }}}
  */
class DecoderSpec extends AnyFreeSpec with Matchers {

  "Decoder: add r1, r2, r3" in {
    simulate(new Decoder) { dut =>
      dut.io.Instr_word.poke("b000000_00010_00011_00001_00000_100000".U)
      dut.io.add_op.expect(Instructions.ADD_ON)
      dut.io.sub_op.expect(Instructions.SUB_OFF)
      dut.io.lw_op.expect(Instructions.LW_OFF)
      dut.io.sw_op.expect(Instructions.SW_OFF)
      dut.io.nop.expect(Instructions.NOP_OFF)
      dut.clock.step()
    }
  }
  "Decoder: sub r0, r5, r6" in {
    simulate(new Decoder) { dut =>
      dut.io.Instr_word.poke("b000000_00101_00110_00000_00000_100010".U)
      dut.io.add_op.expect(Instructions.ADD_OFF)
      dut.io.sub_op.expect(Instructions.SUB_ON)
      dut.io.lw_op.expect(Instructions.LW_OFF)
      dut.io.sw_op.expect(Instructions.SW_OFF)
      dut.io.nop.expect(Instructions.NOP_OFF)
      dut.clock.step()
    }
  }
  "Decoder: lw r5, 100(r2)" in {
    simulate(new Decoder) { dut =>
      dut.io.Instr_word.poke("b100011_00010_00101_00000_00001_100100".U)
      dut.io.add_op.expect(Instructions.ADD_OFF)
      dut.io.sub_op.expect(Instructions.SUB_OFF)
      dut.io.lw_op.expect(Instructions.LW_ON)
      dut.io.sw_op.expect(Instructions.SW_OFF)
      dut.io.nop.expect(Instructions.NOP_OFF)
      dut.clock.step()
    }
  }
  "Decoder: sw r5, 104(r2)" in {
    simulate(new Decoder) { dut =>
      dut.io.Instr_word.poke("b101011_00010_00101_00000_00001_101000".U)
      dut.io.add_op.expect(Instructions.ADD_OFF)
      dut.io.sub_op.expect(Instructions.SUB_OFF)
      dut.io.lw_op.expect(Instructions.LW_OFF)
      dut.io.sw_op.expect(Instructions.SW_ON)
      dut.io.nop.expect(Instructions.NOP_OFF)
      dut.clock.step()
    }
  }
  "Decoder: jal 100" in {
    simulate(new Decoder) { dut =>
      dut.io.Instr_word.poke("b000011_00000_00000_00000_00000_000000".U)
      dut.io.add_op.expect(Instructions.ADD_OFF)
      dut.io.sub_op.expect(Instructions.SUB_OFF)
      dut.io.lw_op.expect(Instructions.LW_OFF)
      dut.io.sw_op.expect(Instructions.SW_OFF)
      dut.io.nop.expect(Instructions.NOP_ON)
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
import chisel3._
import chisel3.experimental.BundleLiterals._
import chisel3.simulator.EphemeralSimulator._
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.must.Matchers

/** This is a trivial example of how to run this Specification From within sbt
  * use:
  * {{{
  * testOnly
  * }}}
  * From a terminal shell use:
  * {{{
  * sbt 'testOnly '
  * }}}
  */
class RegfileSpec extends AnyFreeSpec with Matchers {
  "R0 should always be 0" in {
    simulate(new Regfile) { dut =>
      dut.reset.poke(true.B)
      dut.clock.step()
      // 1. σåÖR0σ»äσ¡ÿσÖ¿Σ╕║Θ¥₧0
      dut.io.WB_Data.poke(1.U)
      dut.io.WB_Enable.poke(true.B)
      dut.io.Reg_WB.poke(0.U)
      dut.clock.step()
      // 2. Φ»╗σÅûR0σ»äσ¡ÿσÖ¿∩╝îσ╕îµ£¢Σ╕║0
      dut.io.RS1.poke(0.U)
      dut.io.RS1_Data.expect(0.U)
    }
  }

  "Ri should be i initial" in {
    simulate(new Regfile) { dut =>
      dut.reset.poke(true.B)
      dut.clock.step()
      for (i <- 1 to 31) {
        dut.io.WB_Enable.poke(false.B)
        dut.io.RS1.poke(i.U)
        dut.io.RS1_Data.expect(i.U)
        dut.clock.step()
      }
    }
  }

  "Ri write and read" in {
    simulate(new Regfile) { dut =>
      for (i <- 1 to 31) {
        val data = 888 + i
        dut.io.WB_Data.poke(data.U)
        dut.io.WB_Enable.poke(true.B)
        dut.io.Reg_WB.poke(i.U)
        dut.clock.step()
      }
      for (i <- 1 to 31) {
        val data = 888 + i
        dut.io.WB_Enable.poke(false.B)
        dut.io.RS1.poke(i.U)
        dut.io.RS1_Data.expect(data.U)
        dut.clock.step()
      }
    }
  }
  "regfile should forbiden write without WB_Enable" in {
    simulate(new Regfile) { dut =>
      dut.reset.poke(true.B)
      dut.clock.step()
      for (i <- 1 to 31) {
        val data = 888 + i
        dut.io.WB_Data.poke(data.U)
        dut.io.WB_Enable.poke(false.B)
        dut.io.Reg_WB.poke(i.U)
        dut.clock.step()
        dut.io.RS1.poke(i.U)
        dut.io.RS1_Data.expect(i.U)
        dut.clock.step()
      }
    }
  }

}
```
