---
title: 安装使用riscv-toolchain
shortTitle: riscv-toolchain
icon: link
description: 构建riscv-toolchain的经验分享
tag: riscv-toolchain
---

## 安装riscv32-unknown-elf-gcc

```bash
wget https://mirror.iscas.ac.cn/riscv-toolchains/release/riscv-collab/riscv-gnu-toolchain/LatestRelease/riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz
tar -zxvf riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz
sudo mv  ./riscv /opt/riscv 
# 到.bashrc加上 export PATH=/opt/riscv/bin:$PATH  
source ~/.bashrc 
riscv32-unknown-elf-gcc --version # 测试

```

:::tip 如果wget下载到中途，想中断怎么做?
1. <kbd>Ctrl</kbd>+<kbd>Z</kbd> 暂停  
2. `wget`**续传**: 添加<kbd>-c</kbd>选项  
`wget -c https://mirror.iscas.ac.cn/riscv-toolchains/release/riscv-collab/riscv-gnu-toolchain/LatestRelease/riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz`  
:::

## 安装特权指令集1.7版本的GNU⼯具链 
方法1： 
运行在riscv-mini项目中的build-riscv-tools.sh文件。
前置条件：
- 设置RISCV环境变量
- GCC版本选用gcc-5.5.0


方法2：
我按照方法1的步骤安装了一遍，打包成tar.xz放在我的github仓库里。  
使用这个tar.xz的方法如下：  
- 下载并解压 , [github release 地址](https://github.com/yongruifang/rcore-doc/releases/tag/riscv-addon)
```bash 
wget https://github.com/yongruifang/rcore-doc/releases/download/riscv-addon/riscv-addon.tar.xz
mkdir /riscv-addon
mv riscv-addon.tar.xz /riscv-addon 
cd /riscv-addon 
tar xvf riscv-addon.tar.xz 
```

- 在`~/.bashrc`中添加配置。
```bash 
export PATH=/home/fangy/riscv/bin:$PATH
export LD_LIBRARY_PATH=/home/fangy/riscv/lib:$LD_LIBRARY_PATH
```
- `source ~/.bashrc`
 



### 测试elf2hex
```bash:no-line-numbers 
运行命令 elf2hex
打印 Usage: elf2hex <width> <depth> <elf_file>
```

### 测试test.s的编译
:::code-tabs #shell 
@tab test.s 
```asmatmel
    .text
    .global _start
_start:
    li x6, 1 
    li x7, 2 
    add x5, x6, x7 
exit:
    csrw mtohost, 1
    j exit
    .end
```
```
:::


```bash :no-line-numbers
riscv32-unknown-elf-gcc -nostdlib -Ttext=0x200 -o test test.s
# 编译完成之后，得到elf文件。
riscv32-unknown-elf-readelf -h test
# 查看系统架构， 入口地址
# 还可以反汇编
riscv32-unknown-elf-objdump -S test

elf2hex 16 4096 test > test.hex
```
