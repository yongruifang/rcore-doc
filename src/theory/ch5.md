---
title: 5. Uart通信机制
icon: hashtag
description: Uart通信机制
tag: riscv
---
*[UART]: Universal Asynchronous Receiver/Transmitter  

UART是一种 异步串行收发协议, 通过两根数据线实现两个设备之间的全双工通信。  
异步，意味着没有时钟信号进行采样同步。  
UART协议通过将开始和停止位添加到数据包中以保证信号能被正常接收。  

### 波特率
波特率，亦为调制速率，指单位时间内载波调制状态变化的次数。  
UART通信双方需要约定好波特率。  
- 常见的波特率：4800、9600、115200

### 数据包
每个数据包可有：
- 1个起始位
- 5~9个数据位
- 可选的奇偶校验位
- 1~2个停止位

### 实现方式
可以通过两个移位寄存器和两个缓冲寄存器实现

可参考Chisel教材中有关实现UART的源代码
```scala
import chisel3._
import circt.stage.ChiselStage._
import chisel3.util._

//- start uart_channel
class UartIO extends DecoupledIO(UInt(8.W)) {}
//- end

// 将时钟频率进行分频，使得时钟频率 近似等于 波特率
/** Transmit part of the UART. A minimal version without any additional buffering. Use a ready/valid handshaking.
  */
//- start uart_tx
class Tx(frequency: Int, baudRate: Int) extends Module {
  val io = IO(new Bundle {
    val txd     = Output(UInt(1.W))
    val channel = Flipped(new UartIO())
  })

  // 计算 传输 1bit 对应的持续时钟周期个数
  // frequency / baudRate可能是小数, 希望四舍五入。
  val BIT_CNT = ((frequency + baudRate / 2) / baudRate - 1).asUInt

  val shiftReg = RegInit(0x7ff.U)   // 共 11位，1个开始位，2个结束位
  val cntReg   = RegInit(0.U(20.W)) // 用于生成正确波特率的计数器
  val bitsReg  = RegInit(0.U(4.W))

  io.channel.ready := (cntReg === 0.U) && (bitsReg === 0.U)
  io.txd           := shiftReg(0)

  when(cntReg === 0.U) {
    cntReg := BIT_CNT
    when(bitsReg =/= 0.U) {
      val shift = shiftReg >> 1
      shiftReg := 1.U ## shift(9, 0)
      bitsReg  := bitsReg - 1.U
    }.otherwise {
      when(io.channel.valid) {
        // two stop bits, data, one start bit
        shiftReg := 3.U ## io.channel.bits ## 0.U
        bitsReg  := 11.U
      }.otherwise {
        shiftReg := 0x7ff.U
      }
    }
  }.otherwise {
    cntReg := cntReg - 1.U
  }
}
//- end

/** Receive part of the UART. A minimal version without any additional buffering. Use a ready/valid handshaking.
  *
  * The following code is inspired by Tommy's receive code at: https://github.com/tommythorn/yarvi
  */
//- start uart_rx
class Rx(frequency: Int = 100000000, baudRate: Int = 115200) extends Module {
  val io = IO(new Bundle {
    val rxd     = Input(UInt(1.W))
    val channel = new UartIO()
  })

  val BIT_CNT   = ((frequency + baudRate / 2) / baudRate - 1).U
  val START_CNT = ((3 * frequency / 2 + baudRate / 2) / baudRate - 1).U

  // Sync in the asynchronous RX data, reset to 1 to not start reading after a reset
  val rxReg = RegNext(RegNext(io.rxd, 1.U), 1.U)

  val shiftReg = RegInit(0.U(8.W))
  val cntReg   = RegInit(0.U(20.W))
  val bitsReg  = RegInit(0.U(4.W))
  val validReg = RegInit(false.B)

  when(cntReg =/= 0.U) {
    cntReg := cntReg - 1.U
  }.elsewhen(bitsReg =/= 0.U) {
    cntReg   := BIT_CNT
    shiftReg := rxReg ## (shiftReg >> 1)
    bitsReg  := bitsReg - 1.U
    // the last bit shifted in
    when(bitsReg === 1.U) {
      validReg := true.B
    }
  }.elsewhen(rxReg === 0.U) {
    // wait 1.5 bits after falling edge of start
    cntReg  := START_CNT
    bitsReg := 8.U
  }

  when(validReg && io.channel.ready) {
    validReg := false.B
  }

  io.channel.bits  := shiftReg
  io.channel.valid := validReg
}
//- end

/** A single byte buffer with a ready/valid interface
  */
//- start uart_buffer
class Buffer extends Module {
  val io = IO(new Bundle {
    val in  = Flipped(new UartIO())
    val out = new UartIO()
  })

  val empty :: full :: Nil = Enum(2)
  val stateReg             = RegInit(empty)
  val dataReg              = RegInit(0.U(8.W))

  io.in.ready  := stateReg === empty
  io.out.valid := stateReg === full

  when(stateReg === empty) {
    when(io.in.valid) {
      dataReg  := io.in.bits
      stateReg := full
    }
  }.otherwise { // full
    when(io.out.ready) {
      stateReg := empty
    }
  }
  io.out.bits := dataReg
}
//- end

/** A transmitter with a single buffer.
  */
//- start uart_buffered_tx
class BufferedTx(frequency: Int = 100000000, baudRate: Int = 115200) extends Module {
  val io = IO(new Bundle {
    val txd     = Output(UInt(1.W))
    val channel = Flipped(new UartIO())
  })
  val tx  = Module(new Tx(frequency, baudRate))
  val buf = Module(new Buffer())

  buf.io.in <> io.channel
  tx.io.channel <> buf.io.out
  io.txd <> tx.io.txd
}
//- end

/** Send a string.
  */
//- start uart_sender
class Sender(frequency: Int, baudRate: Int) extends Module {
  val io = IO(new Bundle {
    val txd = Output(UInt(1.W))
    // val rxd = Input(UInt(1.W))
  })
  val tx = Module(new BufferedTx(frequency, baudRate))
  io.txd := tx.io.txd
  val msg    = "Hello World!"
  val text   = VecInit(msg.map(_.U))
  val len    = msg.length.U
  val cntReg = RegInit(0.U(8.W))
  tx.io.channel.bits  := text(cntReg)
  tx.io.channel.valid := cntReg =/= len
  when(tx.io.channel.ready && cntReg =/= len) {
    cntReg := cntReg + 1.U
  }
}
//- end

//- start uart_echo
class Echo(frequency: Int, baudRate: Int) extends Module {
  val io = IO(new Bundle {
    val txd = Output(UInt(1.W))
    val rxd = Input(UInt(1.W))
  })
  val tx = Module(new BufferedTx(frequency, baudRate))
  val rx = Module(new Rx(frequency, baudRate))
  io.txd    := tx.io.txd
  rx.io.rxd := io.rxd
  tx.io.channel <> rx.io.channel
}
//- end

```

