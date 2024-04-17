---
title: 为自制CPU增加五级流水线
shortTitle: 2. 流水线实现
icon: circle-nodes
headerDepth: 3
description: 在实现单周期CPU之后，我们探索如何通过增加流水线寄存器来实现多级架构，并处理流水线冒险事件
---

## 实验目的
1. 添加流水线寄存器
2. 使用停顿的方式解决分支冒险
3. 使用旁路和停顿的方式解决数据冒险

## 步骤
**基于已经实现的[单周期处理器](/newlab/single.html)进行开发。**

:::important  注意
在实现单周期处理器时，就已经按照IF-ID-EX-MEM-WB的思路来进行开发。  
尽管在概念上被分开，电路在物理上还是耦合在一起的，无法同时处理多条指令。  
:::
解决这个问题的方法是：<font color="red">**使用基于寄存器的时钟同步电路**</font>
- [ ] 在各个流水线阶段之间设置寄存器  
- [ ] 寄存器在时钟上升沿记录各个阶段的输出 
- [ ] 一个周期仅处理一个阶段

### 1. 添加流水线寄存器  
单周期CPU一个周期处理一条指令，以pc寄存器举例，  
指令在每个阶段都关联着同一个pc寄存器`reg_pc`。  
现在为了同时处理五条指令，需要设置多个关联信号，在各个阶段应该有各自的`reg_pc`
:::details Core.scala
添加流水线寄存器。并为对应阶段的寄存器添加前缀
:::code-tabs #reg
@tab Constans 
```scala{2}
val WORD_LEN = 32 
val ADDR_LEN = 5
val CSR_ADDR_LEN = 12
```
@tab 定义
```scala{9,13-18,35,39}
  val regfile     = Mem(32, UInt(WORD_LEN.W))
  val csr_regfile = Mem(4096, UInt(WORD_LEN.W))
  /* 流水线寄存器 */
  // IF/ID 状态保存
  val id_reg_pc   = RegInit(0.U(WORD_LEN.W))
  val id_reg_inst = RegInit(0.U(WORD_LEN.W))
  // ID/EX 状态保存
  val exe_reg_pc            = RegInit(0.U(WORD_LEN.W))
  val exe_reg_wb_addr       = RegInit(0.U(ADDR_LEN.W))
  val exe_reg_op1_data      = RegInit(0.U(WORD_LEN.W))
  val exe_reg_op2_data      = RegInit(0.U(WORD_LEN.W))
  val exe_reg_rs2_data      = RegInit(0.U(WORD_LEN.W))
  val exe_reg_exe_fun       = RegInit(0.U(EXE_FUN_LEN.W))
  val exe_reg_mem_wen       = RegInit(0.U(MEN_LEN.W))
  val exe_reg_rf_wen        = RegInit(0.U(REN_LEN.W))
  val exe_reg_wb_sel        = RegInit(0.U(WB_SEL_LEN.W))
  val exe_reg_csr_addr      = RegInit(0.U(CSR_ADDR_LEN.W))
  val exe_reg_csr_cmd       = RegInit(0.U(CSR_LEN.W))
  val exe_reg_imm_i_sext    = RegInit(0.U(WORD_LEN.W))
  val exe_reg_imm_s_sext    = RegInit(0.U(WORD_LEN.W))
  val exe_reg_imm_b_sext    = RegInit(0.U(WORD_LEN.W))
  val exe_reg_imm_u_shifted = RegInit(0.U(WORD_LEN.W))
  val exe_reg_imm_z_uext    = RegInit(0.U(WORD_LEN.W))
  // EX/MEM 状态保存
  val mem_reg_pc         = RegInit(0.U(WORD_LEN.W))
  val mem_reg_wb_addr    = RegInit(0.U(WORD_LEN.W))
  val mem_reg_op1_data   = RegInit(0.U(WORD_LEN.W))
  val mem_reg_rs2_data   = RegInit(0.U(WORD_LEN.W))
  val mem_reg_mem_wen    = RegInit(0.U(MEN_LEN.W))
  val mem_reg_rf_wen     = RegInit(0.U(REN_LEN.W))
  val mem_reg_wb_sel     = RegInit(0.U(WB_SEL_LEN.W))
  val mem_reg_csr_addr   = RegInit(0.U(CSR_ADDR_LEN.W))
  val mem_reg_csr_cmd    = RegInit(0.U(CSR_LEN.W))
  val mem_reg_imm_z_uext = RegInit(0.U(WORD_LEN.W))
  val mem_reg_alu_out    = RegInit(0.U(WORD_LEN.W))
  // MEM/WB 状态保存
  val wb_reg_wb_addr = RegInit(0.U(WORD_LEN.W))
  val wb_reg_rf_wen  = RegInit(0.U(REN_LEN.W))
  val wb_reg_wb_data = RegInit(0.U(WORD_LEN.W))
```
@tab IF
```scala 
// 预定义
  val exe_br_flg    = Wire(Bool())
  val exe_br_target = Wire(UInt(WORD_LEN.W))
  val exe_jmp_flg   = Wire(Bool())
  val exe_alu_out   = Wire(UInt(WORD_LEN.W))

  val if_reg_pc   = RegInit(START_ADDR)
  val if_inst       = io.imem.inst
  val if_pc_plus4   = if_reg_pc + 4.U(WORD_LEN.W)

  val if_pc_next = MuxCase(
    if_pc_plus4,
    Seq(
      exe_br_flg          -> exe_br_target,
      exe_jmp_flg         -> exe_alu_out,
      (if_inst === ECALL) -> csr_regfile(0x305)
    )
  )
  if_reg_pc    := if_pc_next
  io.imem.addr := if_reg_pc

// 传递
  id_reg_pc   := if_reg_pc
  id_reg_inst := if_inst
```
@tab ID 
```scala 
  val id_rs1_addr = id_reg_inst(19, 15)
  val id_rs2_addr = id_reg_inst(24, 20)
  val id_wb_addr  = id_reg_inst(11, 7)
  val id_rs1_data = Mux(
    (id_rs1_addr =/= 0.U(WORD_LEN.W)),
    regfile(id_rs1_addr),
    0.U(WORD_LEN.W)
  )
  val id_rs2_data = Mux(
    (id_rs2_addr =/= 0.U(WORD_LEN.W)),
    regfile(id_rs2_addr),
    0.U(WORD_LEN.W)
  )
  val id_imm_i      = id_reg_inst(31, 20)
  val id_imm_i_sext = Cat(Fill(20, id_imm_i(11)), id_imm_i)
  val id_imm_s      = Cat(id_reg_inst(31, 25), id_reg_inst(11, 7))
  val id_imm_s_sext = Cat(Fill(20, id_imm_i(11)), id_imm_i)
  val id_imm_b = Cat(
    id_reg_inst(31),
    id_reg_inst(7),
    id_reg_inst(30, 25),
    id_reg_inst(11, 8)
  )
  val id_imm_b_sext = Cat(Fill(19, id_imm_b(11)), id_imm_b, 0.U(1.W))
  val id_imm_j = Cat(
    id_reg_inst(31),
    id_reg_inst(19, 12),
    id_reg_inst(20),
    id_reg_inst(30, 21)
  )
  val id_imm_j_sext    = Cat(Fill(11, id_imm_j(19)), id_imm_j, 0.U(1.W))
  val id_imm_u         = id_reg_inst(31, 12)
  val id_imm_u_shifted = Cat(id_imm_u, Fill(12, 0.U))
  val id_imm_z         = id_reg_inst(19, 15)
  val id_imm_z_uext    = Cat(Fill(27, 0.U), id_imm_z)
  val csignals = ListLookup(
    id_reg_inst,
    List(ALU_X, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_MEM, CSR_X),
    Array(
      LW     -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_MEM, CSR_X),
      SW     -> List(ALU_ADD, OP1_RS1, OP2_IMS, MEN_S, REN_X, WB_X, CSR_X),
      ADD    -> List(ALU_ADD, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      ADDI   -> List(ALU_ADD, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      SUB    -> List(ALU_SUB, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      AND    -> List(ALU_AND, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      OR     -> List(ALU_OR, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      XOR    -> List(ALU_XOR, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      ANDI   -> List(ALU_AND, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU, CSR_X),
      ORI    -> List(ALU_OR, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU, CSR_X),
      XORI   -> List(ALU_XOR, OP1_RS1, OP2_IMS, MEN_X, REN_S, WB_ALU, CSR_X),
      SLL    -> List(ALU_SLL, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      SRL    -> List(ALU_SRL, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      SRA    -> List(ALU_SRA, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      SLLI   -> List(ALU_SLL, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      SRLI   -> List(ALU_SRL, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      SRAI   -> List(ALU_SRA, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      SLT    -> List(ALU_SLT, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      SLTU   -> List(ALU_SLTU, OP1_RS1, OP2_RS2, MEN_X, REN_S, WB_ALU, CSR_X),
      SLTI   -> List(ALU_SLT, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      SLTIU  -> List(ALU_SLTU, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_ALU, CSR_X),
      BEQ    -> List(BR_BEQ, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      BNE    -> List(BR_BNE, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      BGE    -> List(BR_BLT, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      BGEU   -> List(BR_BGE, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      BLT    -> List(BR_BLTU, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      BLTU   -> List(BR_BGEU, OP1_RS1, OP2_RS2, MEN_X, REN_X, WB_X, CSR_X),
      JAL    -> List(ALU_ADD, OP1_PC, OP2_IMJ, MEN_X, REN_S, WB_PC, CSR_X),
      JALR   -> List(ALU_JALR, OP1_RS1, OP2_IMI, MEN_X, REN_S, WB_PC, CSR_X),
      LUI    -> List(ALU_ADD, OP1_X, OP2_IMU, MEN_X, REN_S, WB_ALU, CSR_X),
      AUIPC  -> List(ALU_ADD, OP1_PC, OP2_IMU, MEN_X, REN_S, WB_ALU, CSR_X),
      CSRRW  -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_W),
      CSRRWI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_W),
      CSRRS  -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_S),
      CSRRSI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_S),
      CSRRC  -> List(ALU_COPY1, OP1_RS1, OP2_X, MEN_X, REN_S, WB_CSR, CSR_C),
      CSRRCI -> List(ALU_COPY1, OP1_IMZ, OP2_X, MEN_X, REN_S, WB_CSR, CSR_C),
      ECALL  -> List(ALU_X, OP1_X, OP2_X, MEN_X, REN_X, WB_X, CSR_E)
    )
  )
  val id_exe_fun :: id_op1_sel :: id_op2_sel :: id_mem_wen :: id_rf_wen :: id_wb_sel :: id_csr_cmd :: Nil =
    csignals

  val id_op1_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (id_op1_sel === OP1_RS1) -> id_rs1_data,
      (id_op1_sel === OP1_PC)  -> id_reg_pc
    )
  )
  val id_op2_data = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (id_op2_sel === OP2_RS2) -> id_rs2_data,
      (id_op2_sel === OP2_IMI) -> id_imm_i_sext,
      (id_op2_sel === OP2_IMS) -> id_imm_s_sext,
      (id_op2_sel === OP2_IMJ) -> id_imm_j_sext,
      (id_op2_sel === OP2_IMU) -> id_imm_u_shifted
    )
  )
  val id_csr_addr =
    Mux(id_csr_cmd === CSR_E, 0x342.U(CSR_ADDR_LEN.W), id_reg_inst(31, 20))

  exe_reg_pc            := id_reg_pc
  exe_reg_wb_addr       := id_wb_addr
  exe_reg_op1_data      := id_op1_data
  exe_reg_op2_data      := id_op2_data
  exe_reg_rs2_data      := id_rs2_data
  exe_reg_exe_fun       := id_exe_fun
  exe_reg_mem_wen       := id_mem_wen
  exe_reg_rf_wen        := id_rf_wen
  exe_reg_wb_sel        := id_wb_sel
  exe_reg_csr_addr      := id_csr_addr
  exe_reg_csr_cmd       := id_csr_cmd
  exe_reg_imm_i_sext    := id_imm_i_sext
  exe_reg_imm_s_sext    := id_imm_s_sext
  exe_reg_imm_b_sext    := id_imm_b_sext
  exe_reg_imm_u_shifted := id_imm_u_shifted
  exe_reg_imm_z_uext    := id_imm_z_uext
```
@tab EXE 
```scala 
 exe_alu_out := MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (exe_reg_exe_fun === ALU_ADD) -> (exe_reg_op1_data + exe_reg_op2_data),
      (exe_reg_exe_fun === ALU_SUB) -> (exe_reg_op1_data - exe_reg_op2_data),
      (exe_reg_exe_fun === ALU_AND) -> (exe_reg_op1_data & exe_reg_op2_data),
      (exe_reg_exe_fun === ALU_OR)  -> (exe_reg_op1_data | exe_reg_op2_data),
      (exe_reg_exe_fun === ALU_XOR) -> (exe_reg_op1_data ^ exe_reg_op2_data),
      (exe_reg_exe_fun === ALU_SLL) -> (exe_reg_op1_data << exe_reg_op2_data(
        4,
        0
      ))(
        31,
        0
      ),
      (exe_reg_exe_fun === ALU_SRL) -> (exe_reg_op1_data >> exe_reg_op2_data(
        4,
        0
      )),
      (exe_reg_exe_fun === ALU_SRA) -> (exe_reg_op1_data.asSInt >> exe_reg_op2_data(
        4,
        0
      )).asUInt,
      (exe_reg_exe_fun === ALU_SLT) -> (exe_reg_op1_data.asSInt < exe_reg_op2_data.asSInt).asUInt,
      (exe_reg_exe_fun === ALU_SLTU) -> (exe_reg_op1_data < exe_reg_op2_data).asUInt,
      (exe_reg_exe_fun === ALU_JALR) -> ((exe_reg_op1_data + exe_reg_op2_data) & ~1
        .U(
          WORD_LEN.W
        ))
    )
  )
  exe_br_flg := MuxCase(
    false.B,
    Seq(
      (exe_reg_exe_fun === BR_BEQ) -> (exe_reg_op1_data === exe_reg_op2_data),
      (exe_reg_exe_fun === BR_BNE) -> !(exe_reg_op1_data === exe_reg_op2_data),
      (exe_reg_exe_fun === BR_BLT) -> (exe_reg_op1_data.asSInt < exe_reg_op2_data.asSInt),
      (exe_reg_exe_fun === BR_BGE) -> !(exe_reg_op1_data.asSInt < exe_reg_op2_data.asSInt),
      (exe_reg_exe_fun === BR_BLTU) -> (exe_reg_op1_data < exe_reg_op2_data),
      (exe_reg_exe_fun === BR_BGEU) -> !(exe_reg_op1_data < exe_reg_op2_data)
    )
  )
  exe_br_target := exe_reg_pc + exe_reg_imm_b_sext
  exe_jmp_flg   := (exe_reg_wb_sel === WB_PC)

  mem_reg_pc         := exe_reg_pc
  mem_reg_wb_addr    := exe_reg_wb_addr
  mem_reg_op1_data   := exe_reg_op1_data
  mem_reg_rs2_data   := exe_reg_rs2_data
  mem_reg_mem_wen    := exe_reg_mem_wen
  mem_reg_rf_wen     := exe_reg_rf_wen
  mem_reg_wb_sel     := exe_reg_wb_sel
  mem_reg_csr_addr   := exe_reg_csr_addr
  mem_reg_csr_cmd    := exe_reg_csr_cmd
  mem_reg_imm_z_uext := exe_reg_imm_z_uext
  mem_reg_alu_out    := exe_alu_out
```
@tab MEM 
```scala 
  io.dmem.addr         := mem_reg_alu_out
  io.dmem.write_enable := mem_reg_mem_wen
  io.dmem.write_data   := mem_reg_rs2_data

  val csr_rdata = csr_regfile(mem_reg_csr_addr)
  val csr_wdata = MuxCase(
    0.U(WORD_LEN.W),
    Seq(
      (mem_reg_csr_cmd === CSR_W) -> mem_reg_op1_data,
      (mem_reg_csr_cmd === CSR_S) -> (csr_rdata | mem_reg_op1_data),
      (mem_reg_csr_cmd === CSR_C) -> (csr_rdata & ~mem_reg_op1_data),
      (mem_reg_csr_cmd === CSR_E) -> 11.U(WORD_LEN.W)
    )
  )
  when(mem_reg_csr_cmd > 0.U) {
    csr_regfile(mem_reg_csr_addr) := csr_wdata
  }
  val mem_wb_data = MuxCase(
    mem_reg_alu_out,
    Seq(
      (mem_reg_wb_sel === WB_MEM) -> io.dmem.read_data,
      (mem_reg_wb_sel === WB_PC)  -> (mem_reg_pc + 4.U(WORD_LEN.W)),
      (mem_reg_wb_sel === WB_CSR) -> csr_rdata
    )
  )

  wb_reg_wb_addr := mem_reg_wb_addr
  wb_reg_rf_wen  := mem_reg_rf_wen
  wb_reg_wb_data := mem_wb_data
```
@tab WB 
```scala 
  when(wb_reg_rf_wen === REN_S) {
    regfile(wb_reg_wb_addr) := wb_reg_wb_data
  }
  /* exit信号*/
  io.exit := (if_reg_pc === 0x44.U(WORD_LEN.W)) || (if_inst === 0x0.U(
    WORD_LEN.W
  ))
  io.gp   := regfile(3)
```
:::

#### 以现在的实现来处理一段具有分支冒险的程序
> 什么是分支冒险？  
> 在执行分支指令或者跳转指令的时候，前一个流水线阶段中正在处理的指令变为无效的指令  
:::details 进行测试
:::code-tabs #brhazard
@tab src\c\br_hazard.c
```c{2-4}
int main() {
  asm volatile("addi a0, x0, 1");
  asm volatile("addi a1, x0, 2");
  asm volatile("jal ra, jump");

  // 跳过的
  asm volatile("addi a0, x0, 2");
  asm volatile("addi a1, x0, 3");

  // 跳转目标
  asm volatile("jump:");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("add a2, a0, a1");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("unimp");
}
```
@tab src\c\Makefile 
```scala 
%: %.c 
	riscv32-unknown-elf-gcc -O2 -march=RV32I -c -o $@.o $<
	riscv32-unknown-elf-ld -b elf32-littleriscv $@.o -Ttext=0x0 -o $@
	riscv32-unknown-elf-objcopy -O binary $@ $@.bin 
	od -An -tx1 -w1 -v $@.bin > ./hex/$@.hex
	riscv32-unknown-elf-objdump -b elf32-littleriscv -D $@ > ./dump/$@.elf.dump
	rm -f $@.o 
	rm -f $@ 
	rm -f $@.bin


// 64版本
%: %.c
	riscv64-unknown-elf-gcc -O2 -march=rv32i -mabi=ilp32 -c -o $@.o $<
	riscv64-unknown-elf-ld -m elf32lriscv -b elf32-littleriscv $@.o -Ttext=0x0 -o $@
	riscv64-unknown-elf-objcopy -O binary $@ $@.bin 
	od -An -tx1 -w1 -v $@.bin > ./hex/$@.hex 
	riscv64-unknown-elf-objdump -b elf32-littleriscv -D $@ > ./dump/$@.dump
	rm -f $@.o 
	rm -f $@ 
	rm -f $@.bin 
```
@tab dump文件
```asm 

br_hazard:     file format elf32-littleriscv


Disassembly of section .text:

00000000 <main>:
   0:	00100513          	li	a0,1
   4:	00200593          	li	a1,2
   8:	00c000ef          	jal	14 <jump>
   c:	00200513          	li	a0,2
  10:	00300593          	li	a1,3

00000014 <jump>:
  14:	00000013          	nop
  18:	00000013          	nop
  1c:	00000013          	nop
  20:	00000013          	nop
  24:	00b50633          	add	a2,a0,a1
  28:	00000013          	nop
  2c:	00000013          	nop
  30:	00000013          	nop
  34:	00000013          	nop
  38:	c0001073          	unimp
  3c:	00000513          	li	a0,0
  40:	00008067          	ret

Disassembly of section .comment:

00000000 <.comment>:
   0:	3a434347          	fmsub.d	ft6,ft6,ft4,ft7,rmm
   4:	2820                	fld	fs0,80(s0)
   6:	29554e47          	fmsub.s	ft8,fa0,fs5,ft5,rmm
   a:	3520                	fld	fs0,104(a0)
   c:	332e                	fld	ft6,232(sp)
   e:	302e                	fld	ft0,232(sp)
```
@tab PipelineSpec.scala
```scala 
package single
import chisel3._
import chiseltest._
import org.scalatest.freespec.AnyFreeSpec
import chisel3.experimental.BundleLiterals._

class PipelineSpec extends AnyFreeSpec with ChiselScalatestTester {
  "branch hazard" in {
    test(new Top("src/c/hex/br_hazard.hex"))
      .withAnnotations(Seq(WriteVcdAnnotation)) { dut =>
        while (!dut.io.exit.peek().litToBoolean) {
          dut.clock.step()
        }
      }
  }
}
```
@tab 生成hex并运行测试
```bash 
cd src/c/
mkdir dump hex 
make br_hazard 
cd ../../ 
sbt "testOnly single.PipelineSpec"
gtkwave test_run_dir/branch_hazard/Top.vcd
```
:::
:::details 波形图
![分支冒险现象](/assets/image/pipeline/pipeline-trouble-brhazard.png)

- [ ] 现象：跳转目标[add a2, a0, a1]的操作数值被更新为2和3
- [ ] 原因：不可执行的地址 `0xc`和`0x10`的指令也被执行了
:::

:::tip 
在流水线实现中，仅仅使用寄存器分割各个阶段是不足够的，  
因为指令之间可能存在的依赖关系会导致程序运行错误。  
:::


### 2. 解决分支冒险  
#### 分析
:::details 问：在哪个阶段可以确认下一条要执行的指令的地址
在本次实现中，EX阶段负责判断分支是否成立并计算分支目标地址。
所以答案是：**EX阶段**  
这意味着，在EX阶段前的IF阶段和ID阶段正在处理的指令可能会变为无效的指令 
:::

#### 解决方案  
采用静态分支预测。假设分支指令不发生，继续处理后续指令。  
在发生分支冒险的时候，在IF、ID阶段禁用原本要执行的指令。  

禁用两个阶段的方法：以NOP指令替换原来的指令。  
:::important 了解
逻辑上NOP指令可以是任何指令，如`XOR x0,x0,x0`等，  
为了提高硬件资源使用效率，在RISC-V中，采用ADDI指令作为NOP指令
:::
:::tip 扩展
动态分支预测不固定预测结果，根据代码执行时的分支历史记录，改变预测结果。  
2位计数器——具有4种状态的自动机 和 分支历史表 就属于动态分支预测。

除了分支预测，还有分支**目标地址**预测技术，将分支历史和跳转目标地址存储在缓存中--`BTB`(**Branch Target Buffer**)
:::


#### 静态分支预测实现
:::details 增加停顿信号  
:::code-tabs #feat-brhazard 
@tab Constants 
```scala 
  // 0x13 means ADDI x0,x0,0 , use as NOP
  val BUBBLE = 0x13.U(WORD_LEN.W)
```
@tab IF 
```scala 
  // id_reg_inst := if_inst
  id_reg_inst := Mux((exe_br_flg || exe_jmp_flg), BUBBLE, if_inst)

```
@tab ID 
```scala 
  val id_inst     = Mux((exe_br_flg || exe_jmp_flg), BUBBLE, id_reg_inst) 
  val id_rs1_addr = id_inst(19, 15)
  val id_rs2_addr = id_inst(24, 20)
  val id_wb_addr  = id_inst(11, 7)

... // 以此类推，后续对id_reg_inst的引用 批量替换为 id_inst
```
:::
:::details 波形图
![分支冒险处理-增加气泡](/assets/image/pipeline/pipeline-feat-brhazard.png)

- [x] 现象：跳转目标[add a2, a0, a1]的操作数值为1和2
- [x] 初步解决分支冒险
:::


#### 以现在的实现来处理一段具有数据冒险的程序  
> 什么是数据冒险？  
> 当流水线上并行处理的指令间存在数据依赖时，在被依赖方指令处理结束之前，依赖方无法读取到正确的数据的现象。
:::details 
:::code-tabs #datahazard
@tab c\data_hazard_c 
```c
int main() {
  asm volatile("addi a0,x0,1");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("add a1,a0,a0");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("nop");
  asm volatile("addi a0,x0,1");
  asm volatile("add a1,a0,a0");
  asm volatile("unimp");
}
```
@tab PipelineSpec 
```scala 
  "data hazard" in {
    test(new Top("src/c/hex/data_hazard.hex"))
      .withAnnotations(Seq(WriteVcdAnnotation)) { dut =>
        while (!dut.io.exit.peek().litToBoolean) {
          dut.clock.step()
        }
      }
  }
```
@tab dump 
```asm 

data_hazard:     file format elf32-littleriscv


Disassembly of section .text:

00000000 <main>:
   0:	00100513          	li	a0,1
   4:	00000013          	nop
   8:	00000013          	nop
   c:	00a505b3          	add	a1,a0,a0
  10:	00000013          	nop
  14:	00000013          	nop
  18:	00000013          	nop
  1c:	00000013          	nop
  20:	00100513          	li	a0,1
  24:	00a505b3          	add	a1,a0,a0
  28:	c0001073          	unimp
  2c:	00000513          	li	a0,0
  30:	00008067          	ret

Disassembly of section .comment:

00000000 <.comment>:
   0:	3a434347          	fmsub.d	ft6,ft6,ft4,ft7,rmm
   4:	2820                	fld	fs0,80(s0)
   6:	29554e47          	fmsub.s	ft8,fa0,fs5,ft5,rmm
   a:	3520                	fld	fs0,104(a0)
   c:	332e                	fld	ft6,232(sp)
   e:	302e                	fld	ft0,232(sp)
	...
```
@tab 生成hex文件并测试
```bash
 cd src/c/
 make data_hazard
 cd ../../
 sbt "testOnly single.PipelineSpec"
 gtkwave test_run_dir/data_hazard/Top.vcd
```
:::
:::details 波形图
![id/wb阶段的分支冒险](/assets/image/pipeline/pipeline-trouble-data-hazard-id-wb.png)
- [ ] c地址`add	a1,a0,a0`依赖0地址`li a0, 1`对a0的回写，出现冒险  

![id/exe阶段的分支冒险](/assets/image/pipeline/pipeline-trouble-data-hazard-id-exe.png)
- [ ] 24地址`add a1, a0,a0`依赖20地址`li a0,1`对a0的回写数据，出现冒险  

:::

:::tip 数据冒险需要同时满足两个条件
1. ID阶段读取的寄存器编号与EX/MEM/WB阶段指令写回寄存器编号相等。(不考虑x0)
2. EX/MEM/WB阶段指令的执行有寄存器回写的环节（`rf_wen === REN_S`）
:::
### 3. 解决数据冒险  
#### 分析  
解决角度：
1. 流水线停顿
2. 设置旁通电路, 在硬件上直通，起到`Look Forwarding`的效果
3. 跳转指令顺序 (编译器知识范畴)

> 旁路直通，当数据依赖方的指令已经完成回写数据的计算，直接读取计算结果，避免为了等待读取寄存器而发生的流水线停顿。  

#### 处理方案
:::details 
**IF阶段**  
当出现停顿，维持当前PC，为IF/ID寄存器输入上一个循环的值  
注意跳转成立和停顿同时发生时的优先考虑顺序  

**ID阶段**  
stall信号的计算依赖`id_rs1_addr`和`id_rs2_addr`,  
这两个译码信号来自`id_inst`   
而stall信号生效时会修改`id_inst`, 导致`id_rs1_addr`和`id_rs2_addr`变化，  
<font color="red">存在循环引用的问题</font>  
所以新增id_rs1_addr_b和id_rs2_addr_b(添加`_b`后缀), 从id_reg_inst译码而不是id_inst,  
这样就避免了循环引用  
:::code-tabs #feat-datahazard
@tab IF 
```scala{9,18,25} 
  val stall_flg = Wire(Bool()) 

  val if_pc_next = MuxCase(
    if_pc_plus4,
    Seq(
      exe_br_flg          -> exe_br_target,
      exe_jmp_flg         -> exe_alu_out,
      (if_inst === ECALL) -> csr_regfile(0x305),
      stall_flg           -> if_reg_pc
    )
  )


  if_reg_pc    := if_pc_next
  io.imem.addr := if_reg_pc

  // id_reg_pc := if_reg_pc
  id_reg_pc := Mux(stall_flg, id_reg_pc, if_reg_pc)

  // id_reg_inst := Mux((exe_br_flg || exe_jmp_flg), BUBBLE, if_inst)
  id_reg_inst := MuxCase(
    if_inst,
    Seq(
      (exe_br_flg || exe_jmp_flg) -> BUBBLE,
      stall_flg                   -> id_reg_inst
    )
  )
```
@tab ID 
```scala{4-5,22,27,33-34,41-42}
  // 预先定义
  val mem_wb_data = Wire(UInt(WORD_LEN.W))

  val id_rs1_addr_b = id_reg_inst(19, 15)
  val id_rs2_addr_b = id_reg_inst(24, 20)

  val id_rs1_addr = id_inst(19, 15)
  val id_rs2_addr = id_inst(24, 20)

  val id_rs1_data_hazard =
    (exe_reg_rf_wen === REN_S) && (id_rs1_addr_b =/= 0.U) && (id_rs1_addr_b === exe_reg_wb_addr)
  val id_rs2_data_hazard =
    (exe_reg_rf_wen === REN_S) && (id_rs2_addr_b =/= 0.U) && (id_rs2_addr_b === exe_reg_wb_addr)

  stall_flg := (id_rs1_data_hazard || id_rs2_data_hazard)

  // id_reg_inst := Mux((exe_br_flg || exe_jmp_flg), BUBBLE, if_inst)
  id_reg_inst := MuxCase(
    if_inst,
    Seq(
      (exe_br_flg || exe_jmp_flg) -> BUBBLE,
      stall_flg                   -> id_reg_inst
    )
  )

  val id_inst =
    Mux((exe_br_flg || exe_jmp_flg || stall_flg), BUBBLE, id_reg_inst)

  val id_rs1_data = MuxCase(
    regfile(id_rs1_addr),
    Seq(
      (id_rs1_addr === 0.U(WORD_LEN.W)) -> 0.U(WORD_LEN.W),
      ((id_rs1_addr === mem_reg_wb_addr) && (mem_reg_rf_wen === REN_S)) -> mem_wb_data,
      ((id_rs1_addr === wb_reg_wb_addr) && (wb_reg_rf_wen === REN_S)) -> wb_reg_wb_data
    )
 )
 val id_rs2_data = MuxCase(
    regfile(id_rs2_addr),
    Seq(
      (id_rs2_addr === 0.U(WORD_LEN.W)) -> 0.U(WORD_LEN.W),
      ((id_rs2_addr === mem_reg_wb_addr) && (mem_reg_rf_wen === REN_S)) -> mem_wb_data,
      ((id_rs2_addr === wb_reg_wb_addr) && (wb_reg_rf_wen === REN_S)) -> wb_reg_wb_data
    )
  ) 
```
:::

:::details 波形图

![id/wb阶段的分支冒险](/assets/image/pipeline/pipeline-feat-data-hazard-id-wb.png)
- [x] c地址`add	a1,a0,a0`依赖0地址`li a0, 1`对a0的回写
  - [x] 通过直通解决冒险  

![id/exe阶段的分支冒险](/assets/image/pipeline/pipeline-feat-data-hazard-id-exe.png)
- [x] 24地址`add a1, a0,a0`依赖20地址`li a0,1`对a0的回写
  - [x] 先通过一个气泡过渡到id/mem冒险
  - [x] 再通过直通解决冒险  
:::


## riscv-tests测试
测试增加流水线特性之后，是否还能顺利通过riscv-tests测试？  
:::code-tabs #riscvtest 
@tab 运行测试
```bash 
 sbt "testOnly single.RiscvtestSpec"
```
@tab 测试结果 
```bash
 sbt "testOnly single.RiscvtestSpec"
[info] welcome to sbt 1.9.7 (Eclipse Adoptium Java 17.0.10)
[info] loading settings for project pipeline-build-build-build from metals.sbt ...
[info] loading project definition from /home/fangy/sandbox/pipeline/project/project/project
[info] loading settings for project pipeline-build-build from metals.sbt ...
[info] loading project definition from /home/fangy/sandbox/pipeline/project/project
[success] Generated .bloop/pipeline-build-build.json
[success] Total time: 2 s, completed Apr 15, 2024, 5:04:33 PM
[info] loading settings for project pipeline-build from metals.sbt,plugins.sbt ...
[info] loading project definition from /home/fangy/sandbox/pipeline/project
[success] Total time: 1 s, completed Apr 15, 2024, 5:04:34 PM
[info] loading settings for project root from build.sbt ...
[info] set current project to %NAME% (in build file:/home/fangy/sandbox/pipeline/)
[info] RiscvtestSpec:
[info] - should pass rv32*i-p-*
[info] Run completed in 20 seconds, 842 milliseconds.
[info] Total number of tests run: 1
[info] Suites: completed 1, aborted 0
[info] Tests: succeeded 1, failed 0, canceled 0, ignored 0, pending 0
[info] All tests passed.
[success] Total time: 22 s, completed Apr 15, 2024, 5:04:57 PM
```
:::
