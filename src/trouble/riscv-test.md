---
title: 安装使用riscv-tests测试工具包
icon: link
description: 构建riscv-tests的经验分享
tag: riscv-test
---

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

# 创建脚本批量生成hex文件
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

