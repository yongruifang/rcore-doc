---
title: 常见问题
icon: quote-left
---
汇总一些开发中的前置工作，以及常见的问题及解决方法


:::note 怎么转换成Verilog代码。
:::
- 调用emitSystemVerilogFile，根据需求配置firtool：
```scala
import chisel3._
import circt.stage.ChiselStage._

object Main extends App {
  emitSystemVerilogFile(
    new Top, // 你的Chisel模块
    Array(),
    Array(
      "--strip-debug-info",
      // Disables reg and memory randomization on initialization
      "--disable-all-randomization",
      // Creates memories with write masks in a single reg. Ref. https://github.com/llvm/circt/pull/4275
      "--lower-memories",
      // Avoids "unexpected TOK_AUTOMATIC" errors in Yosys. Ref. https://github.com/llvm/circt/issues/4751
      "--lowering-options=disallowLocalVariables,disallowPackedArrays",
      // Splits the generated Verilog into multiple files
      "--split-verilog",
      // Generates the Verilog files in the specified directory
      "-o=./generated/gshare"
    )
  )
}
```
<AutoCatalog />
