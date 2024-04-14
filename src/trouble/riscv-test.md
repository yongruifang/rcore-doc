---
title: 安装使用riscv-tests测试工具包
shortTitle: riscv-tests
icon: toolbox
description: 构建riscv-tests的经验分享
tag: riscv-test
---

riscv-tests是在RISC-V生态系统中作为开源项目发布的测试包，可以针对不同指令进行动作确认和CPU性能测量。

## 下载编译 
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
```


```bash
mkdir -p ~/my-tests/elf
sudo cp rv32*i-p-* ~/my-tests/elf

elf2hex 16 4096 test > test.hex
```

## 创建脚本批量生成hex文件
```sh
#!/bin/bash

FILES=~/my-tests/elf/rv32*i-p-*
SAVE_DIR=~/my-tests/hex

for f in $FILES; do
	FILE_NAME="${f##*/}"              
	if [[ ${f##*.} != "dump" ]]; then 
		elf2hex 16 4096 $f >$SAVE_DIR/${FILE_NAME}.hex.txt
	fi
done
```

> 一个字节一行，版本如下：
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

## 批量测试
:::details 
:::code-tabs #riscvtests 
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
:::
