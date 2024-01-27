---
title: 2. Chisel的基本语法
icon: hashtag
---
## 1. Chisel位值
- UInt
- SInt
- Bool
### 1.1 整数型对象 UInt/SInt
```scala
val a = UInt(32.W) // 定义32位的无符号整数型信号
val b = SInt(32.W) // 定义32位的有符号整数型信号
```
`UInt()`是`apply()`方法的省略形式  
W是返回表示位宽的<b>Width型</b>的方法
> 变量a、b可以理解为定义32条线
### 1.2 Int -> UInt/SInt
- 两种方法
    - `U()`, `S()`
    - `asUInt()`, `asSInt()`
- <ins>官方推荐前者用于常数，后者用于变量</ins>
```scala
val b = 2
val a = 2.U(32.W)
val c = b.asUInt(32.W)
// Chisel的编译器还有位宽推理功能，可不指定位宽
val b = 2.U(32.W)
val c = 2.U // also work
val e = -2.S(32.W)
val f = -2.S // also work
```
### 1.3 位选择运算符
- `(x:高位, y:低位)` 最低位是0
```scala
val a = "b11000".U
val b = a(3, 0) //get "b1000".U
val c = a(4, 2) //get "b110".U
``` 
### 1.4 Bool
```scala
// define Chisel Bool Type
val a = Bool()  
// Scala Boolean -> Chisel Bool Type
// use method B
val b = true.B  
val c = false.B
```
## 2. 运算符
### 2.1 四则基本运算
使用相同符号 `+ - * / %`
### 2.2 比较运算符
`> >= < <= === a =/=`
- `a === b`：a等于b
- `a =/= b`：a不等于b
### 2.3 逻辑运算符
- Bool型：`&& || !`
- 位型：`& | ~ ^`
### 2.4 移位运算符
`<< >>`

## 3. Module类
<b>定义电路的类都继承自Module类。</b>
```scala
class Sample extends Module {...}
val instance = new Sample()
// Module的apply方法，对应Chisel硬件化
val 硬件 = Module(instance)
```
<ins>当Chisel编译为Verilog时，只有Chisel硬件被提取并放入电路中</ins>

### 3.1 Input/Output
- 分别用参数定义输入/输出信号类型
### 3.2 Bundle
将不同的信号捆绑在一起
### 3.3 IO对象
将Bundle实例作为参数传递
### 3.4 clock/reset信号
继承Module的类，默认定义了clock和reset信号。
### 3.5 Flipped对象
- 用于批量生成翻转端口 (对称端口)
- 使得参数的Bundle实例IO翻转
### 3.6 信号连接
- `:=`: 从右向左连接信号 👈
- `<>`: 批量连接对称端口 👈👉
## 4. 逻辑电路
### 4.1 组合 Wire/WireDefault
```scala
val a = Wire(UInt(32.W))
val b = WireDefault(0.U(32.W))
```
### 4.2 时序 RegInit
```scala
val reg = RegInit(0.U(32.W))
reg := 1.U(32.W) //在下一个时钟上升沿更新为1
reg := reg + 1.U(32.W) // 每个时钟上升沿自增1
```
#### 4.2.1 寄存器文件 - Mem定义
例: 使用Mem对象生成32个寄存器的数组
```scala
// 定义32个 32位宽的 UInt型 寄存器
val regfile = Mem(32, UInt(32.W))
// 读取 1号寄存器
val read_data = regfile(1.U)
// 写入 1号寄存器
regfile(1.U) := write_data
```
<ins>Mem还可以定义其他存储器</ins>
```scala
val mem = Mem(16384, UInt(8.W))
```
<ins>loadMemoryFormFile将文件数据保存在Mem型存储器</ins>
```scala
import chisel3.util.experimental.loadMemoryFromFile
loadMemoryFromFile(mem, "mem.hex") //hex格式的文件
```
## 5. 控制电路
### 5.1 BitPat 位模式
- 以前缀位b的字符串作为参数
    - 未指定0或1的位 表示为 `?`, 称为无关位
- 经常用作条件表达式
```scala
"b10101".U === BitPat("b101??") // true.B
```
### 5.2 when 对象
- 用于执行条件分支
`when elsewhen otherwise`
```scala
when(bool){...
}.elsewhen(bool){...
}.otherwise{
}
```
### 5.3 switch 对象
```scala
switch(信号){
    is(A){...}
    is(B){...}
    ...
}
```
### 5.4 Mux, MuxCase
```scala
val mux = Mux(in, out1, out2) // ✔️out1 ❌out2
val a = MuxCase(默认值, Seq(
    A -> out,
    B -> out,
    C -> out
))
```
### 5.5 ListLookup对象
```scala
result = ListLookup(source, List(A, B, C, ..), Array(
    MODE1 -> List(A1, B1, C1, ..),
    MODE2 -> List(A2, B2, C2. ..),
    ...
))
val a::b::c::Nil = result
// Nil代表空List
// 这个用法类似解构赋值
```

## 6. 直接修改位的对象方法
### 6.1 Cat
- `Cat(Chisel硬件，Chisel硬件)`
- `Cat(Seq(Chisel硬件，Chisel硬件))`
```scala
Cat("b101".U, "b11".U) // return "b10111".U
Cat(Seq("b101".U, "b11".U)) // return "b10111".U
```
### 6.2 Fill
`Fill(重复次数: Int, 重复元素: UInt)`
```scala
Fill(3, 1.U) // return "b111".U
```
## 7. printf
- 用于在测试中打印信号的值
- 在参数中使用插值，格式为`printf(p"xxx${变量}xxx")`