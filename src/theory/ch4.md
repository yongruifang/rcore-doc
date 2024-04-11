---
title: 4. 片上内存
icon: hashtag
description: 片上内存
tag: riscv
---
## IO接口
在riscv-mini中，icache模块和dcache模块通过AXI4总线协议连接到内存模块。
- AXI4总线通过定义五个通道来完成数据的读取和写入操作。
1. 写事务通道：写地址、写数据、写响应
2. 读十五通道：读地址、读数据。
riscv-mini的设计由一个NastiIO接口，本质上是一个完整的AXI4接口。
```scala
class NastiIO(implicit val p: Parameters) extends Bundle {
    val aw=Decoupled(new NastiWriteAddressChannel)
    val w=Decoupled(new NastiWriteDataChannel)
    val b=Decoupled(new NastiWriteResponseChannel).flip
    val ar=Decoupled(new NastiReadAddressChannel)
    val r=Decoupled(new NastiReadDataChannel).flip
}
```

## 存储与计数器模块
对于内存数据的存储，Chisel有RAM的硬件原语
```scala
val mem=Mem(256,UInt(64.W))
def index(addr:UInt) = (addr/8.U)
```
AXI4支持进行一次地址传输后多次数据传输，需要计数。
```scala
def BeatCounter(cond:Bool,beats:UInt):(UInt,Bool)={
    val cnt = RegInit(0.U(8.W))
    val wrap = RegInit(false.B)
    when(cond) {
        cnt := Mux(cnt<beats,cnt+1.U,0.U)
    }
    wrap:=Mux(cond &&
    cnt===beats-1.U, true.B, false.B)
    (cnt, wrap)
}
```
## FSM
四个状态：IDLE、READ、WRITE、ACK
IDLE：等待CPU传来访存信号
READ或者WRITE：通过计数器信号对数据传输次数进行计数
对于WRITE状态，写入完成后到ACK
ACK：返回响应信号。




