---
title: 安装使用riscv-toolchain
icon: link
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
2. `wget -c https://mirror.iscas.ac.cn/riscv-toolchains/release/riscv-collab/riscv-gnu-toolchain/LatestRelease/riscv32-elf-ubuntu-22.04-gcc-nightly-2023.12.14-nightly.tar.gz`  
:::

## 安装特权指令集1.7版本的GNU⼯具链 
方法1： 
运行在riscv-mini项目中的build-riscv-tools.sh文件。
前置条件：
- 设置RISCV环境变量
- GCC版本选用gcc-5.5.0


方法2：
[百度网盘-tar.gz (约700M)](https://pan.baidu.com/s/1wk_n92tIMI2ZW4Ppa9nrZQ?pwd=risc)
- 下载并解压
- 在`~/.bashrc`中添加配置。
```bash 
export PATH=/home/fangy/riscv/bin:$PATH
export LD_LIBRARY_PATH=/home/fangy/riscv/lib:$LD_LIBRARY_PATH
```
- `source ~/.bashrc`
- 测试
```bash:no-line-numbers 
运行命令 elf2hex
打印 Usage: elf2hex <width> <depth> <elf_file>
```

